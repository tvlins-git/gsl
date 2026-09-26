import type { Member, Poll, Message, HostAssignment, Photo } from '@/lib/database.types';

let counter = 0;
const id = () => `test-${++counter}`;

export function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: id(),
    group_id: 'group-1',
    user_id: id(),
    display_name: 'Test User',
    avatar_url: null,
    contact_email: null,
    notification_preference: 'all',
    role: 'member',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildPoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: id(),
    group_id: 'group-1',
    title: 'March dinner',
    created_by: 'user-1',
    status: 'open',
    chosen_slot_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: id(),
    thread_id: 'thread-1',
    sender_id: 'user-1',
    body: 'Hello GSL!',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildHostAssignment(overrides: Partial<HostAssignment> = {}): HostAssignment {
  return {
    id: id(),
    group_id: 'group-1',
    year: 2026,
    month: 7,
    assigned_member_id: null,
    updated_by: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildPhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: id(),
    event_id: 'event-1',
    uploaded_by: 'user-1',
    storage_path: 'file://full.jpg',
    thumb_path: 'file://thumb.jpg',
    ai_score: 0.4,
    width: 800,
    height: 600,
    created_at: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}
