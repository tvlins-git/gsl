import {
  applyFeedMention,
  buildFeedPushBody,
  buildFeedSendPushPayload,
  canDeleteFeedPost,
  canSubmitFeedPost,
  createFeedPost,
  deleteFeedPost,
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
import { isLocalMode, localStore } from '@/lib/local-store';
import { uploadJpegToPhotos } from '@/lib/photo-upload';
import { supabase } from '@/lib/supabase';
import { buildMember } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {
    createFeedPost: jest.fn(),
    deleteFeedPost: jest.fn(),
    getFeedPosts: jest.fn(),
  },
}));

jest.mock('@/lib/photo-upload', () => ({
  uploadJpegToPhotos: jest.fn(async (path: string) => path),
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

  it('only the author can delete a published post', () => {
    expect(canDeleteFeedPost('user-1', 'user-1')).toBe(true);
    expect(canDeleteFeedPost('user-1', 'user-2')).toBe(false);
    expect(canDeleteFeedPost(undefined, 'user-1')).toBe(false);
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
    expect(
      parseFeedMentions('hi @Løg', [{ user_id: 'user-4', display_name: 'Hr. Løg' }])
    ).toEqual({ tagAll: false, userIds: ['user-4'] });
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
    expect(
      listFeedMentionSuggestions('lø', [{ user_id: 'user-4', display_name: 'Hr. Løg' }])[0].insert
    ).toBe('Løg');
  });

  it('replaces the active mention with the chosen token', () => {
    expect(applyFeedMention('hi @Li', { start: 3, end: 6 }, 'Lins')).toEqual({
      body: 'hi @Lins ',
      cursor: 9,
    });
  });
});

describe('createFeedPost and deleteFeedPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(true);
  });

  it('uploads photos through the shared JPEG helper in remote mode', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(false);
    (uploadJpegToPhotos as jest.Mock).mockResolvedValue('group-1/feed/post-1.jpg');
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'post-1',
        group_id: 'group-1',
        author_id: 'user-1',
        body: 'Flower',
        image_path: 'group-1/feed/post-1.jpg',
        tag_all: false,
        created_at: '2026-09-19T00:00:00.000Z',
      },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ single }),
      }),
    });
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: null, error: null });

    await createFeedPost({
      groupId: 'group-1',
      authorId: 'user-1',
      authorName: 'Hr. Lins',
      body: 'Flower',
      imageUri: 'ph://magenta-flower',
      tagAll: false,
      taggedUserIds: [],
      groupUserIds: ['user-1'],
    });

    expect(uploadJpegToPhotos).toHaveBeenCalledWith(
      expect.stringMatching(/^group-1\/feed\/.+\.jpg$/),
      'ph://magenta-flower',
      { maxWidth: 1200, quality: 0.8 }
    );
  });

  it('deletes a local post for the author', async () => {
    (localStore.deleteFeedPost as jest.Mock).mockResolvedValue(undefined);
    await deleteFeedPost({
      postId: 'post-1',
      authorId: 'user-1',
      currentUserId: 'user-1',
      imagePath: 'file://photo.jpg',
    });
    expect(localStore.deleteFeedPost).toHaveBeenCalledWith('post-1');
  });

  it('rejects delete from someone who is not the author', async () => {
    await expect(
      deleteFeedPost({
        postId: 'post-1',
        authorId: 'user-1',
        currentUserId: 'user-2',
      })
    ).rejects.toThrow('You can only delete your own posts.');
    expect(localStore.deleteFeedPost).not.toHaveBeenCalled();
  });

  it('deletes the remote row and storage object for the author', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(false);
    const remove = jest.fn().mockResolvedValue({ error: null });
    const eq = jest.fn().mockResolvedValue({ error: null });
    (supabase.storage.from as jest.Mock).mockReturnValue({ remove });
    (supabase.from as jest.Mock).mockReturnValue({
      delete: jest.fn(() => ({ eq })),
    });

    await deleteFeedPost({
      postId: 'post-1',
      authorId: 'user-1',
      currentUserId: 'user-1',
      imagePath: 'group-1/feed/post-1.jpg',
    });

    expect(remove).toHaveBeenCalledWith(['group-1/feed/post-1.jpg']);
    expect(eq).toHaveBeenCalledWith('id', 'post-1');
  });
});
