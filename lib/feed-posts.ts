import type { FeedPost, Member } from './database.types';
import { isHonorific } from './display-name';
import { compressImage } from './image-compress';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export type { FeedPost };

export type FeedPostSummary = FeedPost & {
  taggedUserIds: string[];
  imageUri: string | null;
};

export type FeedTagSelection =
  | { tagAll: true }
  | { tagAll: false; userIds: string[] };

export type CreateFeedPostInput = {
  groupId: string;
  authorId: string;
  authorName: string;
  body: string;
  imageUri?: string | null;
  tagAll: boolean;
  taggedUserIds: string[];
  groupUserIds: string[];
};

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const MENTION_TOKEN_RE = /@([A-Za-z][A-Za-z0-9._-]*)/g;
const ACTIVE_MENTION_RE = /(^|[\s])@([A-Za-z0-9._-]*)$/;

export type FeedMentionMember = Pick<Member, 'user_id' | 'display_name'> & {
  contact_email?: string | null;
};

export type FeedMentionSuggestion = {
  id: string;
  label: string;
  insert: string;
};

export type ActiveFeedMention = {
  query: string;
  start: number;
  end: number;
};

export function canSubmitFeedPost(body: string, imageUri: string | null | undefined) {
  return Boolean(body.trim() || imageUri);
}

export function isValidFeedTagSelection(selection: FeedTagSelection) {
  return selection.tagAll || Array.isArray(selection.userIds);
}

function normalizeMentionKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function displayNameTokens(displayName: string) {
  return displayName
    .split(/[\s._-]+/)
    .map((token) => token.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
}

function memberMentionKeys(member: FeedMentionMember) {
  const keys = new Set<string>();
  const nameKey = normalizeMentionKey(member.display_name);
  if (nameKey) keys.add(nameKey);
  for (const token of displayNameTokens(member.display_name)) {
    keys.add(token.toLowerCase());
  }
  const emailLocal = member.contact_email?.split('@')[0];
  if (emailLocal) {
    const emailKey = normalizeMentionKey(emailLocal);
    if (emailKey) keys.add(emailKey);
  }
  return keys;
}

function mentionInsertToken(member: FeedMentionMember) {
  const tokens = displayNameTokens(member.display_name);
  const preferred =
    [...tokens].reverse().find((token) => !isHonorific(token)) ?? tokens[0];
  return preferred || normalizeMentionKey(member.display_name);
}

export function extractMentionTokens(body: string): string[] {
  const tokens: string[] = [];
  const matcher = new RegExp(MENTION_TOKEN_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(body)) !== null) {
    const token = match[1].replace(/[._-]+$/g, '');
    if (token) tokens.push(token);
  }
  return tokens;
}

export function parseFeedMentions(body: string, members: FeedMentionMember[]): FeedTagSelection {
  const tokens = extractMentionTokens(body);
  if (tokens.some((token) => token.toLowerCase() === 'everyone')) {
    return { tagAll: true };
  }

  const userIds: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const needle = normalizeMentionKey(token);
    if (!needle) continue;
    for (const member of members) {
      if (seen.has(member.user_id)) continue;
      if (memberMentionKeys(member).has(needle)) {
        seen.add(member.user_id);
        userIds.push(member.user_id);
      }
    }
  }
  return { tagAll: false, userIds };
}

export function getActiveFeedMention(body: string, cursor: number): ActiveFeedMention | null {
  const safeCursor = Math.max(0, Math.min(cursor, body.length));
  const before = body.slice(0, safeCursor);
  const match = before.match(ACTIVE_MENTION_RE);
  if (!match) return null;
  const query = match[2];
  return {
    query,
    start: before.length - query.length - 1,
    end: safeCursor,
  };
}

export function listFeedMentionSuggestions(
  query: string,
  members: FeedMentionMember[]
): FeedMentionSuggestion[] {
  const needle = query.trim().toLowerCase();
  const suggestions: FeedMentionSuggestion[] = [];
  if (!needle || 'everyone'.startsWith(needle)) {
    suggestions.push({ id: 'everyone', label: 'everyone', insert: 'everyone' });
  }
  for (const member of members) {
    const keys = memberMentionKeys(member);
    const key = normalizeMentionKey(needle);
    const matches =
      !needle ||
      (key !== '' && [...keys].some((memberKey) => memberKey.startsWith(key)));
    if (!matches) continue;
    suggestions.push({
      id: member.user_id,
      label: member.display_name,
      insert: mentionInsertToken(member),
    });
  }
  return suggestions;
}

export function applyFeedMention(
  body: string,
  mention: Pick<ActiveFeedMention, 'start' | 'end'>,
  insert: string
) {
  const token = insert.replace(/^@+/, '');
  const next = `${body.slice(0, mention.start)}@${token} ${body.slice(mention.end)}`;
  return { body: next, cursor: mention.start + token.length + 2 };
}

export function formatFeedPostTitle(body: string, hasImage: boolean) {
  const text = body.trim();
  if (text) return text;
  return hasImage ? 'Photo' : 'Update';
}

export function formatFeedPostSubtitle(
  post: { tag_all: boolean; taggedUserIds: string[] },
  members: Member[]
) {
  if (post.tag_all) return 'Tagged everyone';
  const names = post.taggedUserIds
    .map((userId) => members.find((member) => member.user_id === userId)?.display_name)
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return 'Update';
  if (names.length === 1) return `Tagged ${names[0]}`;
  if (names.length === 2) return `Tagged ${names[0]} and ${names[1]}`;
  return `Tagged ${names[0]} and ${names.length - 1} others`;
}

export function resolveFeedPushTargets(input: {
  tagAll: boolean;
  taggedUserIds: string[];
  groupUserIds: string[];
  authorId: string;
}): { userIds: string[] | null; excludeUserIds: string[] } {
  const excludeUserIds = [input.authorId];
  if (input.tagAll) {
    return { userIds: null, excludeUserIds };
  }
  const group = new Set(input.groupUserIds);
  const userIds = input.taggedUserIds.filter(
    (userId) => userId !== input.authorId && group.has(userId)
  );
  return { userIds, excludeUserIds };
}

export function shouldSendFeedPush(targets: { userIds: string[] | null }) {
  return targets.userIds == null || targets.userIds.length > 0;
}

export function buildFeedPushBody(input: {
  authorName: string;
  body: string;
  hasImage: boolean;
}) {
  const text = input.body.trim();
  if (text) {
    const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
    return `${input.authorName}: ${preview}`;
  }
  return `${input.authorName} posted a photo`;
}

export function buildFeedSendPushPayload(input: {
  groupId: string;
  authorId: string;
  authorName: string;
  postId: string;
  body: string;
  hasImage: boolean;
  tagAll: boolean;
  taggedUserIds: string[];
  groupUserIds: string[];
}) {
  const targets = resolveFeedPushTargets(input);
  return {
    type: 'feed',
    group_id: input.groupId,
    exclude_user_ids: targets.excludeUserIds,
    ...(targets.userIds ? { user_ids: targets.userIds } : {}),
    title: 'GSL',
    body: buildFeedPushBody(input),
    data: { postId: input.postId },
  };
}

export function getFeedImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (isLocalMode()) return path;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl || path;
}

function toSummary(post: FeedPost, taggedUserIds: string[]): FeedPostSummary {
  return {
    ...post,
    taggedUserIds,
    imageUri: getFeedImageUrl(post.image_path),
  };
}

export async function loadFeedPosts(groupId: string): Promise<FeedPostSummary[]> {
  if (isLocalMode()) {
    return localStore.getFeedPosts(groupId);
  }

  const { data: posts, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const list = (posts ?? []) as FeedPost[];
  if (list.length === 0) return [];

  const { data: tags } = await supabase
    .from('feed_post_tags')
    .select('post_id, user_id')
    .in(
      'post_id',
      list.map((post) => post.id)
    );

  const taggedByPost = new Map<string, string[]>();
  for (const tag of tags ?? []) {
    const current = taggedByPost.get(tag.post_id) ?? [];
    current.push(tag.user_id);
    taggedByPost.set(tag.post_id, current);
  }

  return list.map((post) => toSummary(post, taggedByPost.get(post.id) ?? []));
}

async function uploadFeedImage(groupId: string, postId: string, imageUri: string) {
  const compressed = await compressImage(imageUri, { maxWidth: 1200, quality: 0.8 });
  const imagePath = `${groupId}/feed/${postId}.jpg`;
  const blob = await (await fetch(compressed.uri)).blob();
  const { error } = await supabase.storage
    .from('photos')
    .upload(imagePath, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return imagePath;
}

export async function createFeedPost(input: CreateFeedPostInput): Promise<FeedPostSummary> {
  const body = input.body.trim();
  if (!canSubmitFeedPost(body, input.imageUri)) {
    throw new Error('Write an update or attach a photo.');
  }

  const taggedUserIds = input.tagAll
    ? []
    : input.taggedUserIds.filter((userId) => input.groupUserIds.includes(userId));

  if (isLocalMode()) {
    const post = await localStore.createFeedPost({
      groupId: input.groupId,
      authorId: input.authorId,
      body,
      imagePath: input.imageUri ?? null,
      tagAll: input.tagAll,
      taggedUserIds,
    });
    return post;
  }

  const postId = createId();
  let imagePath: string | null = null;
  if (input.imageUri) {
    imagePath = await uploadFeedImage(input.groupId, postId, input.imageUri);
  }

  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      id: postId,
      group_id: input.groupId,
      author_id: input.authorId,
      body,
      image_path: imagePath,
      tag_all: input.tagAll,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Could not post.');

  if (!input.tagAll && taggedUserIds.length > 0) {
    const { error: tagError } = await supabase.from('feed_post_tags').insert(
      taggedUserIds.map((userId) => ({
        post_id: postId,
        user_id: userId,
      }))
    );
    if (tagError) throw tagError;
  }

  const summary = toSummary(data as FeedPost, taggedUserIds);
  const pushPayload = buildFeedSendPushPayload({
    groupId: input.groupId,
    authorId: input.authorId,
    authorName: input.authorName,
    postId,
    body,
    hasImage: Boolean(imagePath),
    tagAll: input.tagAll,
    taggedUserIds,
    groupUserIds: input.groupUserIds,
  });
  if (shouldSendFeedPush({ userIds: pushPayload.user_ids ?? null })) {
    await supabase.functions
      .invoke('send-push', {
        body: pushPayload,
      })
      .catch(() => undefined);
  }

  return summary;
}
