import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PostThreadScreen from '@/app/post/[id]';
import { supabase } from '@/lib/supabase';
import {
  listFeedPostReplies,
  loadFeedPostById,
  sendFeedPostReply,
} from '@/lib/feed-post-replies';
import type { FeedPostReply } from '@/lib/database.types';

const existing: FeedPostReply = {
  id: 'reply-old',
  post_id: 'post-1',
  author_id: 'user-2',
  body: 'Nice flower',
  created_at: '2026-09-19T12:30:00.000Z',
};

const saved: FeedPostReply = {
  id: 'reply-new',
  post_id: 'post-1',
  author_id: 'user-1',
  body: 'Thanks!',
  created_at: '2026-09-19T13:00:00.000Z',
};

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useLocalSearchParams: () => ({ id: 'post-1' }),
    router: { push: jest.fn(), back: jest.fn() },
    useFocusEffect: (effect: () => void) => {
      useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [effect]);
    },
  };
});

jest.mock('@/contexts/AuthContext', () => {
  const member = {
    id: 'm1',
    group_id: 'group-1',
    user_id: 'user-1',
    display_name: 'Hr. Lins',
    avatar_url: null,
    contact_email: null,
    notification_preference: 'all',
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
      notification_preference: 'all',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      group_id: 'group-1',
      user_id: 'user-2',
      display_name: 'Alice',
      avatar_url: null,
      contact_email: null,
      notification_preference: 'all',
      role: 'member',
      created_at: '2026-01-01T00:00:00Z',
    },
  ]),
}));

jest.mock('@/lib/feed-post-replies', () => {
  const actual = jest.requireActual('@/lib/feed-post-replies');
  return {
    ...actual,
    loadFeedPostById: jest.fn(),
    listFeedPostReplies: jest.fn(),
    sendFeedPostReply: jest.fn(),
    deleteFeedPostReply: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/lib/feed-posts', () => {
  const actual = jest.requireActual('@/lib/feed-posts');
  return {
    ...actual,
    deleteFeedPost: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

jest.mock('@/lib/feed-post-reply-realtime', () => ({
  subscribeToFeedPostReplyInserts: jest.fn(() => () => undefined),
  resetFeedPostReplyRealtimeForTests: jest.fn(),
}));

jest.mock('@/components/FeedPhoto', () => {
  const React = require('react');
  const { Image } = require('react-native');
  return {
    FeedPhoto: ({ uri, testID }: { uri: string; testID?: string }) =>
      React.createElement(Image, { source: { uri }, testID }),
  };
});

describe('PostThreadScreen', () => {
  beforeEach(() => {
    (loadFeedPostById as jest.Mock).mockResolvedValue({
      id: 'post-1',
      group_id: 'group-1',
      author_id: 'user-1',
      body: 'My flower post',
      image_path: 'file://flower.jpg',
      tag_all: false,
      taggedUserIds: [],
      imageUri: 'file://flower.jpg',
      created_at: '2026-09-19T12:00:00.000Z',
    });
    (listFeedPostReplies as jest.Mock).mockResolvedValue([existing]);
    (sendFeedPostReply as jest.Mock).mockResolvedValue(saved);
    (supabase.functions.invoke as jest.Mock)?.mockResolvedValue?.({ data: {}, error: null });
  });

  it('shows the post and chained replies, and sends a new reply', async () => {
    render(<PostThreadScreen />);

    expect(await screen.findByText('My flower post')).toBeTruthy();
    expect(screen.getByText('Nice flower')).toBeTruthy();
    expect(screen.getByTestId('post-thread-header')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('reply-input'), 'Thanks!');
    fireEvent.press(screen.getByTestId('send-reply'));

    await waitFor(() => expect(sendFeedPostReply).toHaveBeenCalledWith('post-1', 'user-1', 'Thanks!'));
    expect(await screen.findByText('Thanks!')).toBeTruthy();
    // Own reply shows a compact Delete caption (not a full-width action row).
    expect(await screen.findByTestId(`delete-reply-${saved.id}`)).toBeTruthy();
  });
});
