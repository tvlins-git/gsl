jest.mock('@/lib/local-store', () => ({
  isLocalMode: () => false,
  localStore: {
    updateMemberAvatar: jest.fn(),
  },
}));

jest.mock('@/lib/photo-upload', () => ({
  uploadJpegToPhotos: jest.fn(),
  removePhotosObject: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
    from: jest.fn(),
  },
}));

import { avatarStoragePath } from '@/lib/avatar-upload';

describe('avatarStoragePath', () => {
  it('stores avatars under the photos bucket group folder', () => {
    expect(avatarStoragePath('group-1', 'user-9')).toBe('group-1/avatars/user-9.jpg');
  });
});
