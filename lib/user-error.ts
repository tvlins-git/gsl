const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+/g;
const URL_RE = /https?:\/\/\S+/gi;
const SECRET_ASSIGNMENT_RE =
  /\b(anon|service[_-]?role|apikey|api[_-]?key|authorization|bearer|token|password|secret)[=:][^\s]*/gi;

function readErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const record = error as {
      message?: unknown;
      error_description?: unknown;
      msg?: unknown;
      error?: unknown;
    };
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.error_description === 'string' && record.error_description.trim()) {
      return record.error_description;
    }
    if (typeof record.msg === 'string' && record.msg.trim()) return record.msg;
    if (typeof record.error === 'string' && record.error.trim()) return record.error;
  }
  return '';
}

function sanitizeErrorMessage(message: string) {
  return message
    .replace(JWT_RE, '')
    .replace(URL_RE, '')
    .replace(SECRET_ASSIGNMENT_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapKnownUploadError(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('creating blobs from') || (lower.includes('blob') && lower.includes('arraybuffer'))) {
    return 'Could not read the photo on this device. Try another photo.';
  }
  if (
    lower.includes('row-level security') ||
    lower.includes('violates rls') ||
    /\brls\b/.test(lower) ||
    lower.includes('not allowed') ||
    lower.includes('permission') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'Upload was blocked. Sign in again, or ask an admin to allow photo uploads.';
  }
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error')
  ) {
    return 'Network error. Check your connection and try again.';
  }
  return null;
}

/** Short UI error. Strips tokens/URLs and maps a few known native upload failures. */
export function formatUserFacingError(error: unknown, fallback: string) {
  const raw = readErrorMessage(error);
  if (!raw) return fallback;
  const mapped = mapKnownUploadError(raw);
  if (mapped) return mapped;
  const cleaned = sanitizeErrorMessage(raw);
  if (!cleaned) return fallback;
  if (cleaned.length > 140) return `${cleaned.slice(0, 137)}...`;
  return cleaned;
}
