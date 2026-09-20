import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PhotosScreen from '@/app/(tabs)/photos';

const mockEvent = {
  id: 'event-1',
  group_id: 'group-1',
  title: 'MyTest',
  event_date: null,
  created_by: 'user-1',
  created_at: '2026-09-20T10:00:00.000Z',
};

const mockPhotos = [
  {
    id: 'p1',
    event_id: 'event-1',
    uploaded_by: 'user-1',
    storage_path: 'file://one.jpg',
    thumb_path: 'file://one-thumb.jpg',
    ai_score: 0.4,
    width: 800,
    height: 600,
    created_at: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'p2',
    event_id: 'event-1',
    uploaded_by: 'user-1',
    storage_path: 'file://two.jpg',
    thumb_path: 'file://two-thumb.jpg',
    ai_score: 0.3,
    width: 800,
    height: 600,
    created_at: '2026-09-20T10:00:01.000Z',
  },
];

const mockMember = {
  id: 'm1',
  group_id: 'group-1',
  user_id: 'user-1',
  display_name: 'Hr. Lins',
  avatar_url: null,
  contact_email: null,
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    member: mockMember,
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
  ]),
}));

jest.mock('@/lib/photo-events', () => {
  const actual = jest.requireActual('@/lib/photo-events');
  return {
    ...actual,
    loadPhotoEventSummaries: jest.fn(async () => [
      {
        event: mockEvent,
        photoCount: 2,
        coverPhoto: mockPhotos[0],
        previewPhotos: mockPhotos,
        latestPhotoAt: mockPhotos[1].created_at,
      },
    ]),
    deletePhotoEvent: jest.fn(),
  };
});

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {
    getPhotos: jest.fn(async () => mockPhotos),
    getPhotoEventSummaries: jest.fn(async () => []),
  },
}));

jest.mock('@/lib/photo-list', () => ({
  deletePhoto: jest.fn(async () => undefined),
}));

jest.mock('@/lib/pick-image', () => ({
  isCameraPickerAvailable: () => false,
  pickImageUri: jest.fn(),
}));

describe('PhotosScreen album viewer', () => {
  it('opens a full-screen swipe viewer when a grid photo is tapped', async () => {
    render(<PhotosScreen />);
    fireEvent.press(await screen.findByTestId('photo-event-event-1'));
    const gridPhoto = await screen.findByTestId('photo-p1');
    fireEvent.press(gridPhoto);
    expect(await screen.findByTestId('photo-viewer')).toBeTruthy();
    expect(screen.getByTestId('photo-viewer-image-p1').props.source).toEqual({
      uri: 'file://one.jpg',
    });
    fireEvent.press(screen.getByTestId('photo-viewer-close'));
    await waitFor(() => expect(screen.queryByTestId('photo-viewer')).toBeNull());
  });
});
