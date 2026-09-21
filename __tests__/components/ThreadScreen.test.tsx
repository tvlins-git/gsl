import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ThreadScreen from '@/app/thread/[id]';
import { supabase } from '@/lib/supabase';
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

jest.mock('@/lib/thread-messages', () => ({
  listThreadMessages: jest.fn(),
  sendThreadMessage: jest.fn(),
}));

describe('ThreadScreen send', () => {
  beforeEach(() => {
    (listThreadMessages as jest.Mock).mockResolvedValue([existing]);
    (sendThreadMessage as jest.Mock).mockResolvedValue(saved);
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: null, error: null });
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
});
