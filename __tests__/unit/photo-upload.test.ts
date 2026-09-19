import {
  buildJpegUploadBody,
  decodeBase64ToArrayBuffer,
  reactNativeJpegFilePart,
  uploadJpegToPhotos,
} from '@/lib/photo-upload';
import { compressImage } from '@/lib/image-compress';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/image-compress', () => ({
  compressImage: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  const mockBytes = jest.fn();
  return {
    File: class MockFile {
      uri: string;
      constructor(uri: string) {
        this.uri = uri;
      }
      bytes() {
        return mockBytes(this.uri);
      }
    },
    __mockBytes: mockBytes,
  };
});

const mockBytes = require('expo-file-system').__mockBytes as jest.Mock;

describe('decodeBase64ToArrayBuffer', () => {
  it('decodes raw and data-URI base64 without constructing a Blob', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const fromRaw = new Uint8Array(decodeBase64ToArrayBuffer('AQID'));
    const fromDataUri = new Uint8Array(
      decodeBase64ToArrayBuffer('data:image/jpeg;base64,AQID')
    );
    expect(Array.from(fromRaw)).toEqual([1, 2, 3]);
    expect(Array.from(fromDataUri)).toEqual([1, 2, 3]);
    expect(blobSpy).not.toHaveBeenCalled();
    blobSpy.mockRestore();
  });
});

describe('reactNativeJpegFilePart', () => {
  it('builds the RN FormData file object', () => {
    expect(reactNativeJpegFilePart('file://photo.jpg', 'photo.jpg')).toEqual({
      uri: 'file://photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
  });
});

describe('buildJpegUploadBody', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockBytes.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('prefers manipulator base64 and never calls blob()', async () => {
    const blob = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({ blob, arrayBuffer: jest.fn() });

    const body = await buildJpegUploadBody(
      { uri: 'file://cache.jpg', width: 100, height: 80, base64: 'AQID' },
      'feed.jpg'
    );

    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(body as ArrayBuffer))).toEqual([1, 2, 3]);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(blob).not.toHaveBeenCalled();
    expect(mockBytes).not.toHaveBeenCalled();
  });

  it('reads bytes from expo-file-system when base64 is missing', async () => {
    mockBytes.mockResolvedValue(Uint8Array.from([9, 8, 7]));
    const body = await buildJpegUploadBody(
      { uri: 'file://cache.jpg', width: 100, height: 80 },
      'feed.jpg'
    );
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(body as ArrayBuffer))).toEqual([9, 8, 7]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to an RN FormData file part on native when bytes cannot be read', async () => {
    mockBytes.mockRejectedValue(new Error('no file'));
    const append = jest.spyOn(FormData.prototype, 'append');
    const body = await buildJpegUploadBody(
      { uri: 'ph://asset-1', width: 100, height: 80 },
      'feed.jpg'
    );
    expect(body).toBeInstanceOf(FormData);
    expect(append).toHaveBeenCalledWith('', {
      uri: 'ph://asset-1',
      name: 'feed.jpg',
      type: 'image/jpeg',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    append.mockRestore();
  });
});

describe('uploadJpegToPhotos', () => {
  it('uploads an ArrayBuffer JPEG and never uses response.blob()', async () => {
    const blob = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ blob, arrayBuffer: jest.fn() });
    (compressImage as jest.Mock).mockResolvedValue({
      uri: 'file://compressed.jpg',
      width: 1200,
      height: 900,
      base64: 'AQID',
    });
    const upload = jest.fn().mockResolvedValue({ error: null });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload });

    await expect(
      uploadJpegToPhotos('group-1/feed/post-1.jpg', 'ph://flower', { maxWidth: 1200, quality: 0.8 })
    ).resolves.toBe('group-1/feed/post-1.jpg');

    expect(compressImage).toHaveBeenCalledWith(
      'ph://flower',
      expect.objectContaining({ includeBase64: true, maxWidth: 1200 })
    );
    expect(upload).toHaveBeenCalledWith(
      'group-1/feed/post-1.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg' }
    );
    expect(blob).not.toHaveBeenCalled();
    expect(upload.mock.calls[0][1]).not.toBeInstanceOf(Blob);
  });
});
