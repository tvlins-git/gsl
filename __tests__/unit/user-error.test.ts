import { formatUserFacingError } from '@/lib/user-error';

describe('formatUserFacingError', () => {
  it('returns the fallback when there is no message', () => {
    expect(formatUserFacingError(null, 'Could not post. Try again.')).toBe(
      'Could not post. Try again.'
    );
  });

  it('maps the Hermes blob error to a short photo message', () => {
    expect(
      formatUserFacingError(
        new Error("Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported"),
        'Could not post. Try again.'
      )
    ).toBe('Could not read the photo on this device. Try another photo.');
  });

  it('maps RLS/permission failures without dumping details', () => {
    expect(
      formatUserFacingError(new Error('new row violates row-level security policy'), 'fallback')
    ).toBe('Upload was blocked. Sign in again, or ask an admin to allow photo uploads.');
  });

  it('strips JWTs and URLs from unexpected errors', () => {
    const message = formatUserFacingError(
      new Error(
        'Upload failed https://abcd.supabase.co/storage/v1/object/photos/x apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb file too large'
      ),
      'Could not post. Try again.'
    );
    expect(message.toLowerCase()).not.toContain('eyj');
    expect(message.toLowerCase()).not.toContain('http');
    expect(message.toLowerCase()).not.toContain('apikey');
    expect(message).toMatch(/too large/i);
  });
});
