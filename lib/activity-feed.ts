import type { HostAssignment, Member, Poll, Thread } from './database.types';
import {
  formatFeedPostSubtitle,
  formatFeedPostTitle,
  loadFeedPosts,
  type FeedPostSummary,
} from './feed-posts';
import { formatPhotoCount, loadPhotoEventSummaries, albumThumbUris, type PhotoEventSummary } from './photo-events';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export type ActivityKind = 'album' | 'photos' | 'poll' | 'plan_lock' | 'thread' | 'host' | 'post';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle: string;
  timestamp: string;
  path: string;
  authorName: string;
  authorId?: string;
  sourceId?: string;
  imageUri?: string | null;
  imagePath?: string | null;
  thumbUris?: string[];
  photoCount?: number;
};

export type ActivitySources = {
  photoEvents: PhotoEventSummary[];
  polls: Poll[];
  threads: Thread[];
  hostAssignments: HostAssignment[];
  feedPosts: FeedPostSummary[];
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Ignore photo-drop items that landed with the album create itself. */
const PHOTO_DROP_GAP_MS = 30_000;

function nameForUser(members: Member[], userId?: string | null) {
  return members.find((member) => member.user_id === userId)?.display_name ?? 'Friend';
}

function nameForMember(members: Member[], memberId?: string | null) {
  return members.find((member) => member.id === memberId)?.display_name ?? 'Friend';
}

export function activityKindLabel(kind: ActivityKind): string {
  switch (kind) {
    case 'album':
      return 'Album';
    case 'photos':
      return 'Photos';
    case 'poll':
    case 'plan_lock':
      return 'Plan';
    case 'thread':
      return 'Chat';
    case 'host':
      return 'Hosts';
    case 'post':
      return 'Post';
  }
}

export function buildActivityItems(input: {
  members: Member[];
  photoEvents: PhotoEventSummary[];
  polls: Poll[];
  threads: Thread[];
  hostAssignments?: HostAssignment[];
  feedPosts?: FeedPostSummary[];
  limit?: number;
}): ActivityItem[] {
  const {
    members,
    photoEvents,
    polls,
    threads,
    hostAssignments = [],
    feedPosts = [],
    limit = 40,
  } = input;
  const items: ActivityItem[] = [];

  for (const summary of photoEvents) {
    const author = nameForUser(members, summary.event.created_by);
    const thumbUris = albumThumbUris(summary);
    items.push({
      id: `album-${summary.event.id}`,
      kind: 'album',
      title: summary.event.title,
      subtitle: `New album · ${formatPhotoCount(summary.photoCount)}`,
      timestamp: summary.event.created_at,
      path: `/photos?eventId=${summary.event.id}&from=feed`,
      authorName: author,
      sourceId: summary.event.id,
      thumbUris,
      photoCount: summary.photoCount,
    });

    const latest = summary.latestPhotoAt;
    if (latest && summary.photoCount > 0) {
      const gap = new Date(latest).getTime() - new Date(summary.event.created_at).getTime();
      if (Number.isFinite(gap) && gap >= PHOTO_DROP_GAP_MS) {
        items.push({
          id: `photos-${summary.event.id}`,
          kind: 'photos',
          title: summary.event.title,
          subtitle: `${formatPhotoCount(summary.photoCount)} added`,
          timestamp: latest,
          path: `/photos?eventId=${summary.event.id}&from=feed`,
          authorName: author,
          sourceId: summary.event.id,
          thumbUris,
          photoCount: summary.photoCount,
        });
      }
    }
  }

  for (const poll of polls) {
    const author = nameForUser(members, poll.created_by);
    if (poll.status === 'closed') {
      items.push({
        id: `plan-lock-${poll.id}`,
        kind: 'plan_lock',
        title: poll.title,
        subtitle: 'Date locked',
        timestamp: poll.created_at,
        path: `/plan?pollId=${poll.id}`,
        authorName: author,
      });
    } else {
      items.push({
        id: `poll-${poll.id}`,
        kind: 'poll',
        title: poll.title,
        subtitle: 'New poll',
        timestamp: poll.created_at,
        path: `/plan?pollId=${poll.id}`,
        authorName: author,
      });
    }
  }

  for (const thread of threads) {
    items.push({
      id: `thread-${thread.id}`,
      kind: 'thread',
      title: thread.name,
      subtitle: thread.poll_id ? 'Linked to a poll' : 'New chat',
      timestamp: thread.created_at,
      path: `/thread/${thread.id}`,
      authorName: nameForUser(members, thread.created_by),
    });
  }

  for (const host of hostAssignments) {
    if (!host.assigned_member_id) continue;
    const hostName = nameForMember(members, host.assigned_member_id);
    const month = MONTH_NAMES[host.month - 1] ?? 'Month';
    items.push({
      id: `host-${host.id}`,
      kind: 'host',
      title: `${month} ${host.year}`,
      subtitle: `${hostName} is hosting`,
      timestamp: host.updated_at,
      path: '/hosts',
      authorName: nameForUser(members, host.updated_by),
      authorId: host.updated_by ?? undefined,
      sourceId: host.id,
    });
  }

  for (const post of feedPosts) {
    const hasImage = Boolean(post.image_path || post.imageUri);
    items.push({
      id: `post-${post.id}`,
      kind: 'post',
      title: formatFeedPostTitle(post.body, hasImage),
      subtitle: formatFeedPostSubtitle(post, members),
      timestamp: post.created_at,
      path: '/',
      authorName: nameForUser(members, post.author_id),
      authorId: post.author_id,
      sourceId: post.id,
      imageUri: post.imageUri,
      imagePath: post.image_path,
    });
  }

  return items
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export async function loadActivitySources(groupId: string): Promise<ActivitySources> {
  if (isLocalMode()) {
    const [photoEvents, polls, threads, hostAssignments, feedPosts] = await Promise.all([
      localStore.getPhotoEventSummaries(groupId),
      localStore.getPolls(groupId),
      localStore.getThreads(groupId),
      localStore.getHostAssignments(groupId),
      localStore.getFeedPosts(groupId),
    ]);
    return { photoEvents, polls, threads, hostAssignments, feedPosts };
  }

  const [photoEvents, pollsRes, threadsRes, hostsRes, feedPosts] = await Promise.all([
    loadPhotoEventSummaries(groupId),
    supabase.from('polls').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
    supabase.from('threads').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
    supabase.from('host_assignments').select('*').eq('group_id', groupId),
    loadFeedPosts(groupId),
  ]);

  return {
    photoEvents,
    polls: pollsRes.data ?? [],
    threads: threadsRes.data ?? [],
    hostAssignments: hostsRes.data ?? [],
    feedPosts,
  };
}
