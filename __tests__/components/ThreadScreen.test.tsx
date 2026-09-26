import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ThreadScreen from '@/app/thread/[id]';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { getPollLinkTarget } from '@/lib/poll-thread';
import { getThread } from '@/lib/thread-list';
import { listThreadMessages, sendThreadMessage } from '@/lib/thread-messages';
import { buildMessage } from '../factories';

const existing = buildMessage({
  id: 'msg-old',
  thread_id: 'thread-1',
  sender_id: 'user-2',
  body: 'Already in the thread',
  created_at: '2026-07-13T10:00:00Z',
});

const saved = buildMessage({
  id: 'msg-new',
  thread_id: 'thread-1',
  sender_id: 'user-1',
  body: 'Just sent this',
  created_at: '2026-07-13T12:00:00Z',
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'thread-1' }),
  router: { push: jest.fn() },
}));

jest.mock('@/lib/thread-list', () => ({
  getThread: jest.fn(async () => null),
}));

jest.mock('@/lib/poll-thread', () => ({
  getPollLinkTarget: jest.fn(async () => null),
}));

jest.mock('@/contexts/AuthContext', () => {
  const member = {
    id: 'm1',
    group_id: 'group-1',
    user_id: 'user-1',
    display_name: 'Hr. Lins',
    avatar_url: null,
    contact_email: null,
    role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
  };
  return {
    useAuth: () => ({ member }),
  };
});

jest.mock('@/lib/auth', () => ({
  getGroupMembers: jest.fn(async () => [
    {
      id: 'm1',
      group_id: 'group-1',
      user_id: 'user-1',
      display_name: 'Hr. Lins',
      avatar_url: null,
      contact_email: null,
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      group_id: 'group-1',
      user_id: 'user-2',
      display_name: 'Thomas',
      avatar_url: null,
      contact_email: null,
      role: 'member',
      created_at: '2026-01-01T00:00:00Z',
    },
  ]),
}));

jest.mock('@/lib/local-store', () => ({
  isLocalMode: () => false,
  localStore: {
    getMessages: jest.fn(),
    addMessage: jest.fn(),
  },
}));

jest.mock('@/lib/thread-messages', () => {
  const actual = jest.requireActual('@/lib/thread-messages');
  return {
    ...actual,
    listThreadMessages: jest.fn(),
    sendThreadMessage: jest.fn(),
  };
});

describe('ThreadScreen send', () => {
  beforeEach(() => {
    (listThreadMessages as jest.Mock).mockResolvedValue([existing]);
    (sendThreadMessage as jest.Mock).mockResolvedValue(saved);
    (getThread as jest.Mock).mockResolvedValue(null);
    (getPollLinkTarget as jest.Mock).mockResolvedValue(null);
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: null, error: null });
    (router.push as jest.Mock).mockClear();
  });

  it('shows a sent message in the open thread without waiting for realtime', async () => {
    render(<ThreadScreen />);

    expect(await screen.findByText('Already in the thread')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('message-input'), 'Just sent this');
    fireEvent.press(screen.getByTestId('send-message'));

    expect(await screen.findByText('Just sent this')).toBeTruthy();
    expect(screen.getByText('Already in the thread')).toBeTruthy();
    expect(sendThreadMessage).toHaveBeenCalledWith('thread-1', 'user-1', 'Just sent this');
  });

  it('shows a link back to the poll', async () => {
    (getThread as jest.Mock).mockResolvedValue({
      id: 'thread-1',
      poll_id: 'poll-1',
    });
    (getPollLinkTarget as jest.Mock).mockResolvedValue({ id: 'poll-1', title: 'Test' });

    render(<ThreadScreen />);

    expect(await screen.findByText('Test')).toBeTruthy();
    fireEvent.press(screen.getByTestId('poll-thread-link'));
    expect(router.push).toHaveBeenCalledWith('/plan?pollId=poll-1');
  });

  it('suggests members while typing @ and notifies only the tagged person', async () => {
    render(<ThreadScreen />);
    expect(await screen.findByText('Already in the thread')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('message-input'), 'hi @');
    expect(screen.getByTestId('message-mention-suggestions')).toBeTruthy();
    fireEvent.press(screen.getByTestId('message-mention-member-user-2'));
    fireEvent.press(screen.getByTestId('send-message'));

    expect(await screen.findByText('hi @Thomas')).toBeTruthy();
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalled());
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
      body: expect.objectContaining({
        type: 'chat',
        user_ids: ['user-2'],
        body: 'Hr. Lins: hi @Thomas',
      }),
    });
  });
});
