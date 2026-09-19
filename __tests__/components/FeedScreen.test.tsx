import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import FeedScreen from '@/app/(tabs)/index';
import { deleteFeedPost } from '@/lib/feed-posts';
import { loadActivitySources } from '@/lib/activity-feed';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) => {
    effect();
  },
}));

jest.mock('@/components/StoriesRow', () => {
  const { View } = require('react-native');
  return { StoriesRow: () => <View testID="stories-row" /> };
});

jest.mock('@/components/FeedComposer', () => {
  const { View } = require('react-native');
  return { FeedComposer: () => <View testID="feed-composer" /> };
});

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    member: {
      id: 'm1',
      group_id: 'group-1',
      user_id: 'user-1',
      display_name: 'Hr. Lins',
      avatar_url: null,
      contact_email: null,
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    },
  }),
}));

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
      display_name: 'Alice',
      avatar_url: null,
      contact_email: null,
      role: 'member',
      created_at: '2026-01-01T00:00:00Z',
    },
  ]),
}));

jest.mock('@/lib/activity-feed', () => {
  const actual = jest.requireActual('@/lib/activity-feed');
  return {
    ...actual,
    loadActivitySources: jest.fn(),
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

describe('FeedScreen post delete', () => {
  beforeEach(() => {
    (deleteFeedPost as jest.Mock).mockClear();
    (loadActivitySources as jest.Mock).mockResolvedValue({
      photoEvents: [],
      polls: [],
      threads: [],
      hostAssignments: [],
      feedPosts: [
        {
          id: 'mine',
          group_id: 'group-1',
          author_id: 'user-1',
          body: 'My flower post',
          image_path: 'file://flower.jpg',
          tag_all: false,
          taggedUserIds: [],
          imageUri: 'file://flower.jpg',
          created_at: '2026-09-19T12:00:00.000Z',
        },
        {
          id: 'theirs',
          group_id: 'group-1',
          author_id: 'user-2',
          body: 'Alice update',
          image_path: null,
          tag_all: false,
          taggedUserIds: [],
          imageUri: null,
          created_at: '2026-09-19T11:00:00.000Z',
        },
      ],
    });
  });

  it('lets the author delete their published post and hides Delete on others', async () => {
    render(<FeedScreen />);
    expect(await screen.findByText('My flower post')).toBeTruthy();
    expect(screen.getByTestId('delete-feed-item-post-mine')).toBeTruthy();
    expect(screen.queryByTestId('delete-feed-item-post-theirs')).toBeNull();

    fireEvent.press(screen.getByTestId('delete-feed-item-post-mine'));
    await waitFor(() => expect(deleteFeedPost).toHaveBeenCalled());
    expect(deleteFeedPost).toHaveBeenCalledWith({
      postId: 'mine',
      authorId: 'user-1',
      currentUserId: 'user-1',
      imagePath: 'file://flower.jpg',
    });
  });

  it('also deletes from the post detail sheet', async () => {
    render(<FeedScreen />);
    fireEvent.press(await screen.findByTestId('feed-item-post-mine'));
    expect(await screen.findByTestId('feed-post-detail-photo')).toBeTruthy();
    fireEvent.press(await screen.findByTestId('feed-post-delete'));
    await waitFor(() => expect(deleteFeedPost).toHaveBeenCalled());
  });
});
