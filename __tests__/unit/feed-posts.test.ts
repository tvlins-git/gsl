import {
  buildFeedPushBody,
  buildFeedSendPushPayload,
  canSubmitFeedPost,
  formatFeedPostSubtitle,
  formatFeedPostTitle,
  formatTagPickerLabel,
  isValidFeedTagSelection,
  resolveFeedPushTargets,
} from '@/lib/feed-posts';
import { buildMember } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

const members = [
  buildMember({ id: 'm1', user_id: 'user-1', display_name: 'Hr. Lins' }),
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

  it('requires everyone or at least one tag', () => {
    expect(isValidFeedTagSelection({ tagAll: true })).toBe(true);
    expect(isValidFeedTagSelection({ tagAll: false, userIds: [] })).toBe(false);
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
  });

  it('labels the tag picker', () => {
    expect(formatTagPickerLabel({ tagAll: true }, members)).toBe('Everyone');
    expect(formatTagPickerLabel({ tagAll: false, userIds: ['user-2'] }, members)).toBe('Alice');
    expect(formatTagPickerLabel({ tagAll: false, userIds: ['user-2', 'user-3'] }, members)).toBe(
      '2 people'
    );
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
