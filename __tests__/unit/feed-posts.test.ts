import {
  applyFeedMention,
  buildFeedPushBody,
  buildFeedSendPushPayload,
  canSubmitFeedPost,
  extractMentionTokens,
  formatFeedPostSubtitle,
  formatFeedPostTitle,
  getActiveFeedMention,
  isValidFeedTagSelection,
  listFeedMentionSuggestions,
  parseFeedMentions,
  resolveFeedPushTargets,
  shouldSendFeedPush,
} from '@/lib/feed-posts';
import { buildMember } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

const members = [
  buildMember({
    id: 'm1',
    user_id: 'user-1',
    display_name: 'Hr. Lins',
    contact_email: 'hr.lins@gsl.local',
  }),
  buildMember({ id: 'm2', user_id: 'user-2', display_name: 'Alice' }),
  buildMember({ id: 'm3', user_id: 'user-3', display_name: 'Bo' }),
];

describe('feed post helpers', () => {
  it('requires text or a photo', () => {
    expect(canSubmitFeedPost('', null)).toBe(false);
    expect(canSubmitFeedPost('   ', null)).toBe(false);
    expect(canSubmitFeedPost('Hello', null)).toBe(true);
    expect(canSubmitFeedPost('', 'file://photo.jpg')).toBe(true);
  });

  it('allows untagged posts and named or everyone tags', () => {
    expect(isValidFeedTagSelection({ tagAll: true })).toBe(true);
    expect(isValidFeedTagSelection({ tagAll: false, userIds: [] })).toBe(true);
    expect(isValidFeedTagSelection({ tagAll: false, userIds: ['user-2'] })).toBe(true);
  });

  it('titles photo-only posts as Photo', () => {
    expect(formatFeedPostTitle('Ski tomorrow', true)).toBe('Ski tomorrow');
    expect(formatFeedPostTitle('  ', true)).toBe('Photo');
  });

  it('describes everyone vs named tags', () => {
    expect(formatFeedPostSubtitle({ tag_all: true, taggedUserIds: [] }, members)).toBe(
      'Tagged everyone'
    );
    expect(formatFeedPostSubtitle({ tag_all: false, taggedUserIds: ['user-2'] }, members)).toBe(
      'Tagged Alice'
    );
    expect(
      formatFeedPostSubtitle({ tag_all: false, taggedUserIds: ['user-2', 'user-3'] }, members)
    ).toBe('Tagged Alice and Bo');
    expect(
      formatFeedPostSubtitle(
        { tag_all: false, taggedUserIds: ['user-2', 'user-3', 'user-1'] },
        members
      )
    ).toBe('Tagged Alice and 2 others');
    expect(formatFeedPostSubtitle({ tag_all: false, taggedUserIds: [] }, members)).toBe('Update');
  });

  it('targets the whole group minus the author when tagging everyone', () => {
    expect(
      resolveFeedPushTargets({
        tagAll: true,
        taggedUserIds: [],
        groupUserIds: ['user-1', 'user-2', 'user-3'],
        authorId: 'user-1',
      })
    ).toEqual({ userIds: null, excludeUserIds: ['user-1'] });
  });

  it('targets only tagged members for send-push', () => {
    expect(
      resolveFeedPushTargets({
        tagAll: false,
        taggedUserIds: ['user-2', 'user-1', 'stranger'],
        groupUserIds: ['user-1', 'user-2', 'user-3'],
        authorId: 'user-1',
      })
    ).toEqual({ userIds: ['user-2'], excludeUserIds: ['user-1'] });
  });

  it('skips push when nobody is tagged', () => {
    const targets = resolveFeedPushTargets({
      tagAll: false,
      taggedUserIds: [],
      groupUserIds: ['user-1', 'user-2'],
      authorId: 'user-1',
    });
    expect(shouldSendFeedPush(targets)).toBe(false);
    expect(shouldSendFeedPush({ userIds: null })).toBe(true);
    expect(shouldSendFeedPush({ userIds: ['user-2'] })).toBe(true);
  });

  it('builds a send-push payload with user_ids for tagged people', () => {
    const payload = buildFeedSendPushPayload({
      groupId: 'group-1',
      authorId: 'user-1',
      authorName: 'Hr. Lins',
      postId: 'post-1',
      body: 'Hello',
      hasImage: false,
      tagAll: false,
      taggedUserIds: ['user-2'],
      groupUserIds: ['user-1', 'user-2'],
    });
    expect(payload).toMatchObject({
      type: 'feed',
      group_id: 'group-1',
      exclude_user_ids: ['user-1'],
      user_ids: ['user-2'],
      data: { postId: 'post-1' },
    });
    expect(payload.body).toBe('Hr. Lins: Hello');
  });

  it('omits user_ids when tagging everyone so send-push fans out', () => {
    const payload = buildFeedSendPushPayload({
      groupId: 'group-1',
      authorId: 'user-1',
      authorName: 'Hr. Lins',
      postId: 'post-1',
      body: '',
      hasImage: true,
      tagAll: true,
      taggedUserIds: [],
      groupUserIds: ['user-1', 'user-2'],
    });
    expect(payload.user_ids).toBeUndefined();
    expect(buildFeedPushBody({ authorName: 'Hr. Lins', body: '', hasImage: true })).toBe(
      'Hr. Lins posted a photo'
    );
  });
});

describe('feed mention parsing', () => {
  it('extracts mention tokens and ignores trailing punctuation', () => {
    expect(extractMentionTokens('hello @everyone! hi @Alice.')).toEqual(['everyone', 'Alice']);
  });

  it('treats @everyone as tag_all even with other names', () => {
    expect(parseFeedMentions('hello @everyone and @Alice', members)).toEqual({ tagAll: true });
    expect(parseFeedMentions('Hello @EVERYONE', members)).toEqual({ tagAll: true });
  });

  it('matches display-name tokens, slugs, and email local parts', () => {
    expect(parseFeedMentions('hi @Lins', members)).toEqual({
      tagAll: false,
      userIds: ['user-1'],
    });
    expect(parseFeedMentions('hi @hr.lins', members)).toEqual({
      tagAll: false,
      userIds: ['user-1'],
    });
    expect(parseFeedMentions('hi @hr-lins', members)).toEqual({
      tagAll: false,
      userIds: ['user-1'],
    });
    expect(parseFeedMentions('ping @Alice and @Bo', members)).toEqual({
      tagAll: false,
      userIds: ['user-2', 'user-3'],
    });
  });

  it('does not tag when there are no member mentions', () => {
    expect(parseFeedMentions('hello GSL', members)).toEqual({ tagAll: false, userIds: [] });
    expect(parseFeedMentions('hi @nobody', members)).toEqual({ tagAll: false, userIds: [] });
  });

  it('detects the active @ query at the cursor', () => {
    expect(getActiveFeedMention('hello', 5)).toBeNull();
    expect(getActiveFeedMention('hi @', 4)).toEqual({ query: '', start: 3, end: 4 });
    expect(getActiveFeedMention('hi @Li', 6)).toEqual({ query: 'Li', start: 3, end: 6 });
  });

  it('suggests everyone and matching members', () => {
    const all = listFeedMentionSuggestions('', members);
    expect(all[0]).toMatchObject({ id: 'everyone', insert: 'everyone' });
    expect(all.map((item) => item.id)).toEqual(['everyone', 'user-1', 'user-2', 'user-3']);

    const lins = listFeedMentionSuggestions('li', members);
    expect(lins.map((item) => item.id)).toEqual(['user-1']);
    expect(lins[0].insert).toBe('Lins');

    expect(listFeedMentionSuggestions('eve', members)[0].id).toBe('everyone');
  });

  it('replaces the active mention with the chosen token', () => {
    expect(applyFeedMention('hi @Li', { start: 3, end: 6 }, 'Lins')).toEqual({
      body: 'hi @Lins ',
      cursor: 9,
    });
  });
});
