import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_HARDCODED_USER, type AppUser } from '@/constants/hardcoded-user';
import { selectAlbumPreviewPhotos } from './album-previews';
import { getAppUsersSync } from './app-users';
import {
  NOTIFICATION_PREFERENCE_DEFAULT,
  parseNotificationPreference,
  type NotificationPreference,
} from './notification-prefs';
import { summarizePollAcceptance } from './polls';
import type {
  FeedPost,
  FeedPostTag,
  HostAssignment,
  Member,
  Message,
  Photo,
  PhotoEvent,
  Poll,
  PollResponse,
  PollSlot,
  Thread,
} from './database.types';

export const LOCAL_GROUP_ID = '00000000-0000-4000-8000-000000000001';

const STORAGE_KEY = 'gsl_local_data_v1';

let localModeActive = false;
let activeLocalUser: AppUser = DEFAULT_HARDCODED_USER;
let memberEmailCache: Record<string, string> = {};
let memberAvatarCache: Record<string, string> = {};
let memberNotifyCache: Record<string, NotificationPreference> = {};

function memberFromAppUser(user: AppUser): Member {
  return {
    id: user.localMemberId,
    group_id: LOCAL_GROUP_ID,
    user_id: user.localUserId,
    display_name: user.displayName,
    avatar_url: avatarFor(user.localMemberId),
    contact_email: contactEmailFor(user.localMemberId),
    notification_preference: notifyPrefFor(user.localMemberId),
    role: user.role,
    created_at: new Date().toISOString(),
  };
}

export function setActiveLocalUser(user: AppUser) {
  activeLocalUser = user;
}

export function enableLocalMode() {
  localModeActive = true;
}

export function disableLocalMode() {
  localModeActive = false;
}

export function isLocalMode() {
  return localModeActive;
}

function contactEmailFor(memberId: string): string | null {
  const email = memberEmailCache[memberId]?.trim();
  return email || null;
}

function avatarFor(memberId: string): string | null {
  const uri = memberAvatarCache[memberId]?.trim();
  return uri || null;
}

function notifyPrefFor(memberId: string): NotificationPreference {
  return parseNotificationPreference(
    memberNotifyCache[memberId] ?? NOTIFICATION_PREFERENCE_DEFAULT
  );
}

export function createLocalMember(): Member {
  const live = getAppUsersSync().find((user) => user.id === activeLocalUser.id) ?? activeLocalUser;
  return memberFromAppUser(live);
}

export function getLocalGroupMembers(): Member[] {
  return getAppUsersSync().map(memberFromAppUser);
}

interface LocalData {
  host_assignments: HostAssignment[];
  polls: Poll[];
  poll_slots: PollSlot[];
  poll_responses: PollResponse[];
  threads: Thread[];
  messages: Message[];
  photo_events: PhotoEvent[];
  photos: Photo[];
  feed_posts: FeedPost[];
  feed_post_tags: FeedPostTag[];
  member_emails: Record<string, string>;
  member_avatars: Record<string, string>;
  member_notification_prefs: Record<string, NotificationPreference>;
}

const emptyData = (): LocalData => ({
  host_assignments: [],
  polls: [],
  poll_slots: [],
  poll_responses: [],
  threads: [],
  messages: [],
  photo_events: [],
  photos: [],
  feed_posts: [],
  feed_post_tags: [],
  member_emails: {},
  member_avatars: {},
  member_notification_prefs: {},
});

async function readData(): Promise<LocalData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw) as Partial<LocalData>;
    memberEmailCache = parsed.member_emails ?? {};
    memberAvatarCache = parsed.member_avatars ?? {};
    memberNotifyCache = parsed.member_notification_prefs ?? {};
    return {
      ...emptyData(),
      ...parsed,
      feed_posts: parsed.feed_posts ?? [],
      feed_post_tags: parsed.feed_post_tags ?? [],
      member_emails: parsed.member_emails ?? {},
      member_avatars: parsed.member_avatars ?? {},
      member_notification_prefs: parsed.member_notification_prefs ?? {},
    };
  } catch {
    return emptyData();
  }
}

async function writeData(data: LocalData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeThread(thread: Thread): Thread {
  return { ...thread, poll_id: thread.poll_id ?? null };
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const localStore = {
  /** Load persisted local data into memory (emails, etc.). */
  async hydrate() {
    await readData();
  },

  async getHostAssignments(groupId: string) {
    const data = await readData();
    return data.host_assignments.filter((a) => a.group_id === groupId);
  },

  async upsertHostAssignment(
    groupId: string,
    year: number,
    month: number,
    assignedMemberId: string | null,
    userId: string
  ) {
    const data = await readData();
    const idx = data.host_assignments.findIndex(
      (a) => a.group_id === groupId && a.year === year && a.month === month
    );
    const row: HostAssignment = {
      id: idx >= 0 ? data.host_assignments[idx].id : uuid(),
      group_id: groupId,
      year,
      month,
      assigned_member_id: assignedMemberId,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) data.host_assignments[idx] = row;
    else data.host_assignments.push(row);
    await writeData(data);
    return row;
  },

  async deleteHostAssignment(assignmentId: string) {
    const data = await readData();
    data.host_assignments = data.host_assignments.filter((a) => a.id !== assignmentId);
    await writeData(data);
  },

  async getPolls(groupId: string) {
    const data = await readData();
    return data.polls
      .filter((p) => p.group_id === groupId)
      .map((p) => ({
        ...p,
        chosen_slot_id: p.chosen_slot_id ?? null,
        status: p.status ?? 'open',
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getPollSlots(pollId: string) {
    const data = await readData();
    return data.poll_slots.filter((s) => s.poll_id === pollId);
  },

  async getPollResponses(slotIds: string[]) {
    const data = await readData();
    return data.poll_responses.filter((r) => slotIds.includes(r.slot_id));
  },

  async createPoll(groupId: string, title: string, userId: string, slots: { startsAt: string; endsAt: string }[]) {
    const data = await readData();
    const poll: Poll = {
      id: uuid(),
      group_id: groupId,
      title,
      created_by: userId,
      status: 'open',
      chosen_slot_id: null,
      created_at: new Date().toISOString(),
    };
    data.polls.push(poll);
    for (const s of slots) {
      data.poll_slots.push({
        id: uuid(),
        poll_id: poll.id,
        starts_at: s.startsAt,
        ends_at: s.endsAt,
      });
    }
    await writeData(data);
    return poll;
  },

  async appendPollSlots(pollId: string, slots: { startsAt: string; endsAt: string }[]) {
    const data = await readData();
    const created: PollSlot[] = [];
    for (const s of slots) {
      const slot: PollSlot = {
        id: uuid(),
        poll_id: pollId,
        starts_at: s.startsAt,
        ends_at: s.endsAt,
      };
      data.poll_slots.push(slot);
      created.push(slot);
    }
    await writeData(data);
    return created;
  },

  async updatePollSlotTimes(slotId: string, times: { startsAt: string; endsAt: string }) {
    const data = await readData();
    const slot = data.poll_slots.find((item) => item.id === slotId);
    if (!slot) throw new Error('Slot not found');
    slot.starts_at = times.startsAt;
    slot.ends_at = times.endsAt;
    await writeData(data);
    return slot;
  },

  async removePollSlot(slotId: string) {
    const data = await readData();
    data.poll_slots = data.poll_slots.filter((slot) => slot.id !== slotId);
    data.poll_responses = data.poll_responses.filter((response) => response.slot_id !== slotId);
    await writeData(data);
  },

  async upsertPollResponse(slotId: string, memberId: string, response: 'yes' | 'maybe' | 'no') {
    const data = await readData();
    const idx = data.poll_responses.findIndex((r) => r.slot_id === slotId && r.member_id === memberId);
    const row: PollResponse = {
      id: idx >= 0 ? data.poll_responses[idx].id : uuid(),
      slot_id: slotId,
      member_id: memberId,
      response,
    };
    if (idx >= 0) data.poll_responses[idx] = row;
    else data.poll_responses.push(row);
    await writeData(data);
  },

  async getPollSummaries(polls: Poll[], memberNamesById: Record<string, string>) {
    const data = await readData();
    const summaries: Record<string, string> = {};
    for (const poll of polls) {
      const slotIds = data.poll_slots.filter((s) => s.poll_id === poll.id).map((s) => s.id);
      const responses = data.poll_responses.filter((r) => slotIds.includes(r.slot_id));
      summaries[poll.id] = summarizePollAcceptance(
        responses.map((r) => ({
          slotId: r.slot_id,
          memberId: r.member_id,
          response: r.response,
        })),
        memberNamesById
      );
    }
    return summaries;
  },

  async deletePoll(pollId: string) {
    const data = await readData();
    const slotIds = data.poll_slots.filter((s) => s.poll_id === pollId).map((s) => s.id);
    const threadIds = new Set(
      data.threads.filter((thread) => thread.poll_id === pollId).map((thread) => thread.id)
    );
    data.polls = data.polls.filter((p) => p.id !== pollId);
    data.poll_slots = data.poll_slots.filter((s) => s.poll_id !== pollId);
    data.threads = data.threads.filter((thread) => !threadIds.has(thread.id));
    data.messages = data.messages.filter((message) => !threadIds.has(message.thread_id));
    data.poll_responses = data.poll_responses.filter((r) => !slotIds.includes(r.slot_id));
    await writeData(data);
  },

  async updateMemberEmail(memberId: string, email: string | null) {
    const data = await readData();
    const trimmed = email?.trim() ?? '';
    if (trimmed) {
      data.member_emails[memberId] = trimmed;
    } else {
      delete data.member_emails[memberId];
    }
    memberEmailCache = { ...data.member_emails };
    await writeData(data);
    return createLocalMember();
  },

  async updateMemberAvatar(memberId: string, avatarUrl: string | null): Promise<string | null> {
    const data = await readData();
    const trimmed = avatarUrl?.trim() ?? '';
    if (trimmed) {
      data.member_avatars[memberId] = trimmed;
    } else {
      delete data.member_avatars[memberId];
    }
    memberAvatarCache = { ...data.member_avatars };
    await writeData(data);
    return trimmed || null;
  },

  async updateMemberNotificationPreference(
    memberId: string,
    preference: NotificationPreference
  ): Promise<Member> {
    const data = await readData();
    const next = parseNotificationPreference(preference);
    if (next === NOTIFICATION_PREFERENCE_DEFAULT) {
      delete data.member_notification_prefs[memberId];
    } else {
      data.member_notification_prefs[memberId] = next;
    }
    memberNotifyCache = { ...data.member_notification_prefs };
    await writeData(data);
    return createLocalMember();
  },

  async lockPoll(pollId: string, slotId: string) {
    const data = await readData();
    const poll = data.polls.find((p) => p.id === pollId);
    if (!poll) throw new Error('Poll not found');
    const slot = data.poll_slots.find((s) => s.id === slotId && s.poll_id === pollId);
    if (!slot) throw new Error('Slot not found');
    poll.status = 'closed';
    poll.chosen_slot_id = slotId;
    await writeData(data);
    return poll;
  },

  async getThreads(groupId: string) {
    const data = await readData();
    return data.threads
      .filter((t) => t.group_id === groupId)
      .map(normalizeThread)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getThread(threadId: string) {
    const data = await readData();
    const thread = data.threads.find((t) => t.id === threadId);
    return thread ? normalizeThread(thread) : null;
  },

  async findThreadByPoll(pollId: string) {
    const data = await readData();
    const match = data.threads
      .filter((t) => t.poll_id === pollId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return match ? normalizeThread(match) : null;
  },

  async getPoll(pollId: string) {
    const data = await readData();
    return data.polls.find((p) => p.id === pollId) ?? null;
  },

  async createThread(groupId: string, name: string, userId: string, pollId: string | null = null) {
    const data = await readData();
    const thread: Thread = {
      id: uuid(),
      group_id: groupId,
      name,
      created_by: userId,
      poll_id: pollId,
      created_at: new Date().toISOString(),
    };
    data.threads.push(thread);
    await writeData(data);
    return thread;
  },

  async deleteThread(threadId: string) {
    const data = await readData();
    data.threads = data.threads.filter((t) => t.id !== threadId);
    data.messages = data.messages.filter((m) => m.thread_id !== threadId);
    await writeData(data);
  },

  async getMessages(threadId: string) {
    const data = await readData();
    return data.messages.filter((m) => m.thread_id === threadId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async addMessage(threadId: string, senderId: string, body: string) {
    const data = await readData();
    const message: Message = {
      id: uuid(),
      thread_id: threadId,
      sender_id: senderId,
      body,
      created_at: new Date().toISOString(),
    };
    data.messages.push(message);
    await writeData(data);
    return message;
  },

  async getPhotoEvents(groupId: string) {
    const data = await readData();
    return data.photo_events.filter((e) => e.group_id === groupId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getPhotoEventSummaries(groupId: string) {
    const data = await readData();
    const events = data.photo_events
      .filter((e) => e.group_id === groupId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return events.map((event) => {
      const eventPhotos = data.photos.filter((p) => p.event_id === event.id);
      const previewPhotos = selectAlbumPreviewPhotos(eventPhotos);
      return {
        event,
        photoCount: eventPhotos.length,
        previewPhotos,
        coverPhoto: previewPhotos[0] ?? null,
        latestPhotoAt: eventPhotos.reduce<string | null>((latest, photo) => {
          if (!latest || photo.created_at > latest) return photo.created_at;
          return latest;
        }, null),
      };
    });
  },

  async createPhotoEvent(groupId: string, title: string, userId: string, eventDate?: string) {
    const data = await readData();
    const event: PhotoEvent = {
      id: uuid(),
      group_id: groupId,
      title,
      event_date: eventDate ?? null,
      created_by: userId,
      created_at: new Date().toISOString(),
    };
    data.photo_events.push(event);
    await writeData(data);
    return event;
  },

  async getPhotos(eventId: string) {
    const data = await readData();
    return data.photos.filter((p) => p.event_id === eventId).sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
  },

  async addPhoto(eventId: string, userId: string, storagePath: string, thumbPath?: string) {
    const data = await readData();
    const photo: Photo = {
      id: uuid(),
      event_id: eventId,
      uploaded_by: userId,
      storage_path: storagePath,
      thumb_path: thumbPath ?? storagePath,
      ai_score: Math.random(),
      width: null,
      height: null,
      created_at: new Date().toISOString(),
    };
    data.photos.push(photo);
    await writeData(data);
    return photo;
  },

  async deletePhoto(photoId: string) {
    const data = await readData();
    data.photos = data.photos.filter((p) => p.id !== photoId);
    await writeData(data);
  },

  async deletePhotoEvent(eventId: string) {
    const data = await readData();
    data.photo_events = data.photo_events.filter((e) => e.id !== eventId);
    data.photos = data.photos.filter((p) => p.event_id !== eventId);
    await writeData(data);
  },

  async deleteFeedPost(postId: string) {
    const data = await readData();
    data.feed_posts = (data.feed_posts ?? []).filter((post) => post.id !== postId);
    data.feed_post_tags = (data.feed_post_tags ?? []).filter((tag) => tag.post_id !== postId);
    await writeData(data);
  },

  async getFeedPosts(groupId: string) {
    const data = await readData();
    const posts = data.feed_posts ?? [];
    const tags = data.feed_post_tags ?? [];
    return posts
      .filter((post) => post.group_id === groupId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((post) => ({
        ...post,
        taggedUserIds: tags.filter((tag) => tag.post_id === post.id).map((tag) => tag.user_id),
        imageUri: post.image_path,
      }));
  },

  async createFeedPost(input: {
    groupId: string;
    authorId: string;
    body: string;
    imagePath: string | null;
    tagAll: boolean;
    taggedUserIds: string[];
  }): Promise<FeedPost & { taggedUserIds: string[]; imageUri: string | null }> {
    const data = await readData();
    data.feed_posts ??= [];
    data.feed_post_tags ??= [];
    const post: FeedPost = {
      id: uuid(),
      group_id: input.groupId,
      author_id: input.authorId,
      body: input.body,
      image_path: input.imagePath,
      tag_all: input.tagAll,
      created_at: new Date().toISOString(),
    };
    data.feed_posts.push(post);
    if (!input.tagAll) {
      for (const userId of input.taggedUserIds) {
        data.feed_post_tags.push({ post_id: post.id, user_id: userId });
      }
    }
    await writeData(data);
    return {
      ...post,
      taggedUserIds: input.tagAll ? [] : input.taggedUserIds,
      imageUri: post.image_path,
    };
  },
};
