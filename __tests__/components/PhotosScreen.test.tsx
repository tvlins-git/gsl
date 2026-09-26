import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  notification_preference: 'all' as const,
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  router: {
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
    replace: jest.fn(),
  },
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
      notification_preference: 'all',
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

const mockGetPhotos = jest.fn(async () => mockPhotos);
const mockAddPhoto = jest.fn(async () => undefined);
const mockPickImageUris = jest.fn(async () => [] as string[]);

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {
    getPhotos: (...args: unknown[]) => mockGetPhotos(...args),
    addPhoto: (...args: unknown[]) => mockAddPhoto(...args),
    getPhotoEventSummaries: jest.fn(async () => []),
  },
}));

jest.mock('@/lib/photo-list', () => ({
  deletePhoto: jest.fn(async () => undefined),
}));

jest.mock('@/lib/pick-image', () => ({
  isCameraPickerAvailable: () => false,
  pickImageUri: jest.fn(),
  pickImageUris: (...args: unknown[]) => mockPickImageUris(...args),
}));

jest.mock('@/lib/image-compress', () => ({
  compressImage: jest.fn(async (uri: string) => ({
    uri,
    width: 800,
    height: 600,
    base64: 'AQID',
  })),
}));

jest.setTimeout(15000);

describe('PhotosScreen album viewer', () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    (router.back as jest.Mock).mockClear();
    (router.replace as jest.Mock).mockClear();
    mockGetPhotos.mockReset();
    mockGetPhotos.mockResolvedValue(mockPhotos);
    mockAddPhoto.mockReset();
    mockAddPhoto.mockResolvedValue(undefined);
    mockPickImageUris.mockReset();
    mockPickImageUris.mockResolvedValue([]);
  });

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

  it('returns to the albums list when Back is pressed from Photos', async () => {
    render(<PhotosScreen />);
    fireEvent.press(await screen.findByTestId('photo-event-event-1'));
    expect(await screen.findByText('← Back to albums')).toBeTruthy();
    fireEvent.press(screen.getByTestId('album-back-btn'));
    expect(await screen.findByText('Albums')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('uploads every gallery URI selected in one picker session', async () => {
    mockPickImageUris.mockResolvedValue(['file://a.jpg', 'file://b.jpg', 'file://c.jpg']);
    render(<PhotosScreen />);
    fireEvent.press(await screen.findByTestId('photo-event-event-1'));
    fireEvent.press(await screen.findByTestId('album-gallery-btn'));

    await waitFor(() => expect(mockPickImageUris).toHaveBeenCalledWith('gallery', { multiple: true }));
    await waitFor(() => expect(mockAddPhoto).toHaveBeenCalledTimes(3));
    expect(mockAddPhoto).toHaveBeenNthCalledWith(
      1,
      'event-1',
      'user-1',
      'data:image/jpeg;base64,AQID',
      'data:image/jpeg;base64,AQID'
    );
    expect(mockAddPhoto).toHaveBeenNthCalledWith(
      2,
      'event-1',
      'user-1',
      'data:image/jpeg;base64,AQID',
      'data:image/jpeg;base64,AQID'
    );
    expect(mockAddPhoto).toHaveBeenNthCalledWith(
      3,
      'event-1',
      'user-1',
      'data:image/jpeg;base64,AQID',
      'data:image/jpeg;base64,AQID'
    );
  });
});

describe('PhotosScreen album back from Feed', () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ eventId: 'event-1', from: 'feed' });
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    (router.back as jest.Mock).mockClear();
    (router.replace as jest.Mock).mockClear();
    mockGetPhotos.mockReset();
    mockGetPhotos.mockResolvedValue(mockPhotos);
  });

  it('pops back to Feed when history exists', async () => {
    (router.canGoBack as jest.Mock).mockReturnValue(true);
    render(<PhotosScreen />);
    expect(await screen.findByText('← Back to Feed')).toBeTruthy();
    fireEvent.press(screen.getByTestId('album-back-btn'));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('album-back-btn')).toBeNull());
  });

  it('replaces to Feed when Feed deep-linked in with no history', async () => {
    render(<PhotosScreen />);
    expect(await screen.findByText('MyTest')).toBeTruthy();
    fireEvent.press(await screen.findByTestId('album-back-btn'));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('album-back-btn')).toBeNull());
  });

  it('does not immediately re-open the album after Back', async () => {
    render(<PhotosScreen />);
    await screen.findByTestId('album-back-btn');
    fireEvent.press(screen.getByTestId('album-back-btn'));
    await waitFor(() => expect(screen.queryByTestId('album-back-btn')).toBeNull());
    expect(await screen.findByText('Albums')).toBeTruthy();
  });
});
