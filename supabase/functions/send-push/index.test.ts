import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildExpoPushPayload, filterRecipients } from './push.ts';

Deno.test('filterRecipients excludes sender', () => {
  const tokens = [
    { userId: 'u1', token: 'tok1' },
    { userId: 'u2', token: 'tok2' },
    { userId: 'u3', token: 'tok3' },
  ];
  const filtered = filterRecipients(tokens, ['u2']);
  assertEquals(filtered.length, 2);
  assertEquals(filtered.every((t) => t.userId !== 'u2'), true);
});

Deno.test('filterRecipients deduplicates tokens', () => {
  const tokens = [
    { userId: 'u1', token: 'tok1' },
    { userId: 'u2', token: 'tok1' },
  ];
  assertEquals(filterRecipients(tokens).length, 1);
});

Deno.test('buildExpoPushPayload includes GSL data', () => {
  const payload = buildExpoPushPayload(
    [{ userId: 'u1', token: 'tok1' }],
    { title: 'GSL', body: 'New message', data: { type: 'chat', threadId: 't1' } }
  );
  assertEquals(payload[0].title, 'GSL');
  assertEquals(payload[0].data?.type, 'chat');
});
