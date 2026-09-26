import { isLocalMode, localStore } from './local-store';
import { removePhotosObject, uploadJpegToPhotos } from './photo-upload';
import { supabase } from './supabase';

/** Storage path for a member avatar in the public `photos` bucket. */
export function avatarStoragePath(groupId: string, userId: string): string {
  return `${groupId}/avatars/${userId}.jpg`;
}

export function getAvatarPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload (or replace) a profile picture and return the public URL to store on members.avatar_url.
 * Local mode keeps a data/file URI in AsyncStorage instead of Storage.
 */
export async function uploadMemberAvatar(input: {
  groupId: string;
  userId: string;
  memberId: string;
  imageUri: string;
}): Promise<string> {
  if (isLocalMode()) {
    const url = await localStore.updateMemberAvatar(input.memberId, input.imageUri);
    if (!url) throw new Error('Could not save avatar.');
    return url;
  }

  const path = avatarStoragePath(input.groupId, input.userId);
  await uploadJpegToPhotos(path, input.imageUri, {
    maxWidth: 512,
    quality: 0.85,
    includeBase64: true,
    upsert: true,
  });
  // Bust CDN/browser cache after replace.
  const publicUrl = `${getAvatarPublicUrl(path)}?v=${Date.now()}`;
  const { error } = await supabase
    .from('members')
    .update({ avatar_url: publicUrl })
    .eq('id', input.memberId);
  if (error) throw error;
  return publicUrl;
}

export async function clearMemberAvatar(input: {
  groupId: string;
  userId: string;
  memberId: string;
}): Promise<void> {
  if (isLocalMode()) {
    await localStore.updateMemberAvatar(input.memberId, null);
    return;
  }

  const path = avatarStoragePath(input.groupId, input.userId);
  try {
    await removePhotosObject(path);
  } catch {
    // Missing object is fine when clearing.
  }
  const { error } = await supabase
    .from('members')
    .update({ avatar_url: null })
    .eq('id', input.memberId);
  if (error) throw error;
}
