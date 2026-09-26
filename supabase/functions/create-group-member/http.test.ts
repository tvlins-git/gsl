import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { corsHeaders, json, preflight, SUPABASE_CORS_ALLOW_HEADERS } from './http.ts';

const WEB_ORIGIN = 'https://gsl.example';

function preflightRequest(extraHeaders = 'x-retry-count') {
  return new Request('https://example.supabase.co/functions/v1/create-group-member', {
    method: 'OPTIONS',
    headers: {
      Origin: WEB_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': `authorization, x-client-info, apikey, content-type, ${extraHeaders}`,
    },
  });
}

Deno.test('browser preflight allows the supabase-js invoke instead of 405', async () => {
  const response = preflight(preflightRequest('x-custom-client'));
  if (!response) throw new Error('expected a preflight response');

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods')?.includes('POST'), true);
  assertEquals(response.headers.get('Access-Control-Allow-Methods')?.includes('OPTIONS'), true);

  const allowed = response.headers.get('Access-Control-Allow-Headers') ?? '';
  for (const header of [...SUPABASE_CORS_ALLOW_HEADERS.split(', '), 'x-custom-client']) {
    assertEquals(allowed.includes(header), true, `missing ${header}`);
  }
  assertEquals(await response.text(), 'ok');
});

Deno.test('preflight falls back to the supabase-js header list', () => {
  const response = preflight(
    new Request('https://example.supabase.co/functions/v1/create-group-member', { method: 'OPTIONS' })
  );
  assertEquals(response?.headers.get('Access-Control-Allow-Headers'), SUPABASE_CORS_ALLOW_HEADERS);
});

Deno.test('POST is not treated as preflight', () => {
  const response = preflight(
    new Request('https://example.supabase.co/functions/v1/create-group-member', { method: 'POST' })
  );
  assertEquals(response, null);
});

Deno.test('function responses stay readable in the browser', () => {
  const response = json(
    preflightRequest(),
    { error: 'Only an admin can add members.' },
    403
  );
  assertEquals(response.status, 403);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  assertEquals(corsHeaders()['Access-Control-Allow-Origin'], '*');
});
