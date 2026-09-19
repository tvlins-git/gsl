import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { compressImage, type CompressOptions, type CompressResult } from './image-compress';
import { supabase } from './supabase';

export type JpegUploadBody = ArrayBuffer | FormData;

export type ReactNativeFilePart = {
  uri: string;
  name: string;
  type: 'image/jpeg';
};

const JPEG_TYPE = 'image/jpeg' as const;

export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '');
  const atobFn = globalThis.atob;
  if (typeof atobFn !== 'function') {
    throw new Error('Could not decode the photo.');
  }
  const binary = atobFn(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function reactNativeJpegFilePart(uri: string, filename: string): ReactNativeFilePart {
  return {
    uri,
    name: filename,
    type: JPEG_TYPE,
  };
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function readFileBytes(uri: string): Promise<ArrayBuffer | null> {
  try {
    const file = new File(uri);
    const bytes = await file.bytes();
    if (!bytes || bytes.byteLength === 0) return null;
    return arrayBufferFromBytes(bytes);
  } catch {
    return null;
  }
}

function createNativeJpegFormData(uri: string, filename: string): FormData {
  const formData = new FormData();
  formData.append('', reactNativeJpegFilePart(uri, filename) as unknown as Blob);
  if (typeof (formData as FormData & { has?: (key: string) => boolean }).has !== 'function') {
    Object.defineProperty(formData, 'has', {
      value(key: string) {
        return formData.getAll(key).length > 0;
      },
    });
  }
  return formData;
}

/**
 * Build a Supabase Storage body without `fetch(uri).blob()`.
 * Hermes throws "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported"
 * when Blob is constructed from file bytes — the previous feed/album path.
 */
export async function buildJpegUploadBody(
  compressed: CompressResult,
  filename: string
): Promise<JpegUploadBody> {
  if (compressed.base64) {
    return decodeBase64ToArrayBuffer(compressed.base64);
  }

  const fileBytes = await readFileBytes(compressed.uri);
  if (fileBytes) return fileBytes;

  if (Platform.OS !== 'web') {
    return createNativeJpegFormData(compressed.uri, filename);
  }

  const response = await fetch(compressed.uri);
  return response.arrayBuffer();
}

export async function uploadJpegToPhotos(
  storagePath: string,
  imageUri: string,
  options: CompressOptions = {}
): Promise<string> {
  const compressed = await compressImage(imageUri, {
    maxWidth: 1200,
    quality: 0.8,
    includeBase64: true,
    ...options,
  });
  const filename = storagePath.split('/').pop() || 'photo.jpg';
  const body = await buildJpegUploadBody(compressed, filename);
  const { error } = await supabase.storage.from('photos').upload(storagePath, body, {
    contentType: JPEG_TYPE,
  });
  if (error) throw error;
  return storagePath;
}
