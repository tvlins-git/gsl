import { avatarStoragePath } from '@/lib/avatar-upload';

describe('avatarStoragePath', () => {
  it('stores avatars under the photos bucket group folder', () => {
    expect(avatarStoragePath('group-1', 'user-9')).toBe('group-1/avatars/user-9.jpg');
  });
});
