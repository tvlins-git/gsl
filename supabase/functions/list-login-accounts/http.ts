/**
 * Browser CORS for supabase-js function invokes.
 *
 * Keep the default header list aligned with `@supabase/supabase-js/cors`
 * (app lockfile: 2.110.3). Browsers also send Access-Control-Request-Headers
 * on the OPTIONS preflight; those must be allowed or the POST never runs and
 * supabase-js reports "Failed to send a request to the Edge Function".
 * Native clients do not send a preflight, so this only changes the web path.
 */
export const SUPABASE_CORS_ALLOW_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-retry-count',
].join(', ');

function allowHeaders(req?: Request): string {
  const requested = (req?.headers.get('Access-Control-Request-Headers') ?? '')
    .split(',')
    .map((header) => header.trim().toLowerCase())
    .filter((header) => header.length > 0 && !/[\r\n]/.test(header));
  const defaults = SUPABASE_CORS_ALLOW_HEADERS.split(',').map((header) => header.trim());
  return [...new Set([...defaults, ...requested])].join(', ');
}

export function corsHeaders(req?: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': allowHeaders(req),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/** Successful preflight, or null when the request should be handled normally. */
export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response('ok', { status: 200, headers: corsHeaders(req) });
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
