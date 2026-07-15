import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_HARDCODED_USER, type AppUser } from '@/constants/hardcoded-user';
import { getAppUsersSync } from './app-users';
import { summarizePollAcceptance } from './polls';
import type {
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

function memberFromAppUser(user: AppUser): Member {
  return {
    id: user.localMemberId,
    group_id: LOCAL_GROUP_ID,
    user_id: user.localUserId,
    display_name: user.displayName,
    avatar_url: null,
    contact_email: contactEmailFor(user.localMemberId),
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
  member_emails: Record<string, string>;
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
  member_emails: {},
});

async function readData(): Promise<LocalData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = { ...emptyData(), ...JSON.parse(raw) } as LocalData;
    memberEmailCache = parsed.member_emails ?? {};
    return parsed;
  } catch {
    return emptyData();
  }
}

async function writeData(data: LocalData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    data.polls = data.polls.filter((p) => p.id !== pollId);
    data.poll_slots = data.poll_slots.filter((s) => s.poll_id !== pollId);
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
    return data.threads.filter((t) => t.group_id === groupId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createThread(groupId: string, name: string, userId: string) {
    const data = await readData();
    const thread: Thread = {
      id: uuid(),
      group_id: groupId,
      name,
      created_by: userId,
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
    return events.map((event) => ({
      event,
      photoCount: data.photos.filter((p) => p.event_id === event.id).length,
    }));
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
};
