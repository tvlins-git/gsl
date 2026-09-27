import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  buildExpoPushPayload,
  filterRecipients,
  filterRecipientsByPreference,
  inferTagNotification,
  mergeRecipients,
  resolveChatPushRecipients,
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

Deno.test('filterRecipients keeps shared tokens for non-author recipients', () => {
  const tokens = [
    { userId: 'diana', token: 'shared-phone' },
    { userId: 'lins', token: 'shared-phone' },
    { userId: 'lins', token: 'lins-only' },
    { userId: 'test', token: 'test-phone' },
  ];
  // Diana authored a message tagging Hr. Lins. Author is excluded by user_id,
  // but the shared token still delivers once as Lins (not dropped).
  const filtered = filterRecipients(tokens, ['diana'], ['lins', 'test']);
  assertEquals(
    filtered.map((t) => `${t.userId}:${t.token}`),
    ['lins:shared-phone', 'lins:lins-only', 'test:test-phone']
  );
  assertEquals(filtered.every((t) => t.userId !== 'diana'), true);
});

Deno.test('filterRecipients: Diana has only shared tokens still gets push', () => {
  const tokens = [
    { userId: 'lins', token: 'shared-a' },
    { userId: 'diana', token: 'shared-a' },
    { userId: 'lins', token: 'shared-b' },
    { userId: 'diana', token: 'shared-b' },
    { userId: 'lins', token: 'lins-only' },
  ];
  // Hr. Lins → Diana: Diana has no unique token; shared ones must still deliver.
  const filtered = filterRecipients(tokens, ['lins'], ['diana']);
  assertEquals(
    filtered.map((t) => `${t.userId}:${t.token}`),
    ['diana:shared-a', 'diana:shared-b']
  );
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

Deno.test('inferTagNotification ignores bare flag without @ in chat body', () => {
  assertEquals(
    inferTagNotification({
      type: 'chat',
      tagNotification: true,
      body: 'Diana: Hi',
    }),
    false
  );
  assertEquals(
    inferTagNotification({
      type: 'chat',
      tagNotification: true,
      body: 'Diana: hi @Lins',
    }),
    true
  );
  assertEquals(
    inferTagNotification({
      type: 'chat',
      tagNotification: true,
      body: 'Diana: hello @everybody',
    }),
    true
  );
  assertEquals(
    inferTagNotification({
      type: 'chat',
      tagNotification: false,
      body: 'Diana: hi @Lins',
    }),
    false
  );
  assertEquals(
    inferTagNotification({
      type: 'feed',
      tagNotification: true,
      body: 'Diana: photo',
    }),
    true
  );
});

Deno.test('resolveChatPushRecipients: untagged never targets tagged-only', () => {
  const diana = 'diana';
  const lins = 'lins';
  const tokens = [
    { userId: diana, token: 'shared' },
    { userId: lins, token: 'shared' },
    { userId: lins, token: 'lins-phone' },
  ];
  const prefs = new Map([
    [diana, 'all' as const],
    [lins, 'tagged' as const],
  ]);

  // Stale client includes Lins in user_ids with tag_notification false / bare true.
  const untagged = resolveChatPushRecipients(tokens, prefs, [diana], [lins], false);
  assertEquals(untagged.map((r) => r.userId), []);

  // Tagged: deliver to Lins on shared + unique tokens (author diana excluded by id).
  const tagged = resolveChatPushRecipients(tokens, prefs, [diana], [lins], true);
  assertEquals(
    tagged.map((r) => `${r.userId}:${r.token}`),
    ['lins:shared', 'lins:lins-phone']
  );

  const everybody = resolveChatPushRecipients(tokens, prefs, [diana], null, true);
  assertEquals(
    everybody.map((r) => `${r.userId}:${r.token}`),
    ['lins:shared', 'lins:lins-phone']
  );
});
