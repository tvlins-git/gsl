import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  buildExpoPushPayload,
  filterRecipients,
  filterRecipientsByPreference,
  mergeRecipients,
  shouldReceivePushForPreference,
} from './push.ts';

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

Deno.test('filterRecipients skips tokens also registered to excluded users', () => {
  const tokens = [
    { userId: 'diana', token: 'shared-phone' },
    { userId: 'lins', token: 'shared-phone' },
    { userId: 'test', token: 'test-phone' },
  ];
  // Diana authored a message tagging Hr. Lins on a shared TestFlight device.
  // Do not deliver to the shared token or she sees her own push.
  const filtered = filterRecipients(tokens, ['diana'], ['lins', 'test']);
  assertEquals(filtered.map((t) => t.userId), ['test']);
});

Deno.test('filterRecipients include list targets tagged users', () => {
  const tokens = [
    { userId: 'u1', token: 'tok1' },
    { userId: 'u2', token: 'tok2' },
    { userId: 'u3', token: 'tok3' },
  ];
  const filtered = filterRecipients(tokens, ['u1'], ['u2']);
  assertEquals(filtered.map((t) => t.userId), ['u2']);
});

Deno.test('filterRecipients deduplicates tokens', () => {
  const tokens = [
    { userId: 'u1', token: 'tok1' },
    { userId: 'u2', token: 'tok1' },
  ];
  assertEquals(filterRecipients(tokens).length, 1);
});

Deno.test('mergeRecipients adds unique tokens only', () => {
  const merged = mergeRecipients(
    [{ userId: 'u2', token: 'tok2' }],
    [
      { userId: 'u3', token: 'tok3' },
      { userId: 'u2b', token: 'tok2' },
    ]
  );
  assertEquals(merged.map((r) => r.userId), ['u2', 'u3']);
});

Deno.test('buildExpoPushPayload includes GSL data', () => {
  const payload = buildExpoPushPayload(
    [{ userId: 'u1', token: 'tok1' }],
    { title: 'GSL', body: 'New message', data: { type: 'chat', threadId: 't1' } }
  );
  assertEquals(payload[0].title, 'GSL');
  assertEquals(payload[0].data?.type, 'chat');
});

Deno.test('shouldReceivePushForPreference respects off/tagged/all', () => {
  assertEquals(shouldReceivePushForPreference('off', true), false);
  assertEquals(shouldReceivePushForPreference('tagged', false), false);
  assertEquals(shouldReceivePushForPreference('tagged', true), true);
  assertEquals(shouldReceivePushForPreference('all', false), true);
});

Deno.test('filterRecipientsByPreference drops muted and untagged users', () => {
  const recipients = [
    { userId: 'u1', token: 'tok1' },
    { userId: 'u2', token: 'tok2' },
    { userId: 'u3', token: 'tok3' },
  ];
  const prefs = new Map([
    ['u1', 'off' as const],
    ['u2', 'tagged' as const],
    ['u3', 'all' as const],
  ]);
  assertEquals(
    filterRecipientsByPreference(recipients, prefs, false).map((r) => r.userId),
    ['u3']
  );
  assertEquals(
    filterRecipientsByPreference(recipients, prefs, true).map((r) => r.userId),
    ['u2', 'u3']
  );
});
