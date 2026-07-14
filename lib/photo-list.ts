import type { Photo } from './database.types';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export async function deletePhoto(photo: Photo) {
  if (isLocalMode()) {
    await localStore.deletePhoto(photo.id);
    return;
  }

  const paths = [photo.storage_path, photo.thumb_path].filter(
    (path, index, all): path is string => !!path && all.indexOf(path) === index
  );

  if (paths.length > 0) {
    await supabase.storage.from('photos').remove(paths).catch(() => undefined);
  }

  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
}
