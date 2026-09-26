import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import FeedScreen from '@/app/(tabs)/index';
import { deleteFeedPost } from '@/lib/feed-posts';
import { deleteHostAssignment } from '@/lib/host-assignments';
import { loadActivitySources } from '@/lib/activity-feed';

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    router: { push: jest.fn() },
    // Real useFocusEffect runs on focus, not during render. Calling the
    // callback on every render re-invokes loadFeed → setState → render
    // forever, which is what timed out this suite on CI after #17.
    useFocusEffect: (effect: () => void) => {
      useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [effect]);
    },
  };
});

jest.mock('@/components/FeedPhoto', () => {
  const React = require('react');
  const { Image } = require('react-native');
  return {
    FeedPhoto: ({
      uri,
      testID,
      style,
    }: {
      uri: string;
      testID?: string;
      style?: object;
    }) =>
      React.createElement(Image, {
        source: { uri },
        style,
        resizeMode: 'contain',
        testID,
      }),
  };
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
      notification_preference: 'all',
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

jest.mock('@/lib/host-assignments', () => {
  const actual = jest.requireActual('@/lib/host-assignments');
  return {
    ...actual,
    deleteHostAssignment: jest.fn().mockResolvedValue(undefined),
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
    const detailPhoto = await screen.findByTestId('feed-post-detail-photo');
    expect(detailPhoto.props.resizeMode).toBe('contain');
    expect(StyleSheet.flatten(detailPhoto.props.style).height).not.toBe(280);
    fireEvent.press(await screen.findByTestId('feed-post-delete'));
    await waitFor(() => expect(deleteFeedPost).toHaveBeenCalled());
  });
});

describe('FeedScreen host delete', () => {
  beforeEach(() => {
    (deleteHostAssignment as jest.Mock).mockClear();
    (loadActivitySources as jest.Mock).mockResolvedValue({
      photoEvents: [],
      polls: [],
      threads: [],
      hostAssignments: [
        {
          id: 'host-mine',
          group_id: 'group-1',
          year: 2027,
          month: 12,
          assigned_member_id: 'm1',
          updated_by: 'user-1',
          updated_at: '2026-09-26T12:00:00.000Z',
        },
        {
          id: 'host-theirs',
          group_id: 'group-1',
          year: 2026,
          month: 11,
          assigned_member_id: 'm2',
          updated_by: 'user-2',
          updated_at: '2026-09-26T11:00:00.000Z',
        },
      ],
      feedPosts: [],
    });
  });

  it('lets the updater delete their host feed row and hides Delete on others', async () => {
    render(<FeedScreen />);
    expect(await screen.findByText('Dec 2027')).toBeTruthy();
    expect(screen.getByTestId('delete-feed-item-host-host-mine')).toBeTruthy();
    expect(screen.queryByTestId('delete-feed-item-host-host-theirs')).toBeNull();

    fireEvent.press(screen.getByTestId('delete-feed-item-host-host-mine'));
    await waitFor(() => expect(deleteHostAssignment).toHaveBeenCalled());
    expect(deleteHostAssignment).toHaveBeenCalledWith({
      assignmentId: 'host-mine',
      updatedBy: 'user-1',
      currentUserId: 'user-1',
    });
  });
});

describe('FeedScreen album thumbs', () => {
  beforeEach(() => {
    (loadActivitySources as jest.Mock).mockResolvedValue({
      photoEvents: [
        {
          event: {
            id: 'event-1',
            group_id: 'group-1',
            title: 'MyTest',
            event_date: null,
            created_by: 'user-1',
            created_at: '2026-09-20T10:00:00.000Z',
          },
          photoCount: 2,
          coverPhoto: {
            id: 'p1',
            storage_path: 'file://full-1.jpg',
            thumb_path: 'file://thumb-1.jpg',
            uploaded_by: 'user-1',
          },
          previewPhotos: [
            {
              id: 'p1',
              storage_path: 'file://full-1.jpg',
              thumb_path: 'file://thumb-1.jpg',
              uploaded_by: 'user-1',
            },
            {
              id: 'p2',
              storage_path: 'file://full-2.jpg',
              thumb_path: 'file://thumb-2.jpg',
              uploaded_by: 'user-1',
            },
          ],
          latestPhotoAt: '2026-09-20T10:00:01.000Z',
        },
      ],
      polls: [],
      threads: [],
      hostAssignments: [],
      feedPosts: [],
    });
  });

  it('shows compact album thumbnails from real photo URIs', async () => {
    render(<FeedScreen />);
    expect(await screen.findByText('MyTest')).toBeTruthy();
    expect(screen.getByTestId('feed-item-album-event-1-thumbs-0').props.source).toEqual({
      uri: 'file://thumb-1.jpg',
    });
    expect(screen.getByTestId('feed-item-album-event-1-thumbs-1').props.source).toEqual({
      uri: 'file://thumb-2.jpg',
    });
  });
});
