import { activityKindLabel, buildActivityItems } from '@/lib/activity-feed';
import type { PhotoEventSummary } from '@/lib/photo-events';
import { buildHostAssignment, buildMember, buildPoll } from '../factories';
import type { Thread } from '@/lib/database.types';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

function buildSummary(overrides: Partial<PhotoEventSummary['event']> & {
  photoCount?: number;
  latestPhotoAt?: string | null;
} = {}): PhotoEventSummary {
  const { photoCount = 0, latestPhotoAt = null, ...event } = overrides;
  return {
    event: {
      id: event.id ?? 'event-1',
      group_id: event.group_id ?? 'group-1',
      title: event.title ?? 'Ski trip',
      event_date: event.event_date ?? null,
      created_by: event.created_by ?? 'user-1',
      created_at: event.created_at ?? '2026-09-01T10:00:00.000Z',
    },
    photoCount,
    coverPhoto: null,
    latestPhotoAt,
  };
}

function buildThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'thread-1',
    group_id: 'group-1',
    name: 'Weekend plans',
    created_by: 'user-1',
    created_at: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildActivityItems', () => {
  const members = [
    buildMember({ id: 'm1', user_id: 'user-1', display_name: 'Hr. Lins' }),
    buildMember({ id: 'm2', user_id: 'user-2', display_name: 'Alice' }),
  ];

  it('builds album, poll, thread, and host items newest first', () => {
    const items = buildActivityItems({
      members,
      photoEvents: [buildSummary({ created_at: '2026-09-01T10:00:00.000Z' })],
      polls: [buildPoll({ id: 'p1', title: 'Dinner', created_by: 'user-2', created_at: '2026-09-03T10:00:00.000Z' })],
      threads: [buildThread({ created_at: '2026-09-02T10:00:00.000Z' })],
      hostAssignments: [
        buildHostAssignment({
          id: 'h1',
          assigned_member_id: 'm2',
          updated_by: 'user-1',
          year: 2026,
          month: 9,
          updated_at: '2026-09-04T10:00:00.000Z',
        }),
      ],
    });

    expect(items.map((item) => item.kind)).toEqual(['host', 'poll', 'thread', 'album']);
    expect(items[0]).toMatchObject({
      kind: 'host',
      title: 'Sep 2026',
      subtitle: 'Alice is hosting',
      path: '/hosts',
    });
    expect(items[1]).toMatchObject({
      kind: 'poll',
      title: 'Dinner',
      subtitle: 'New poll',
      path: '/plan?pollId=p1',
      authorName: 'Alice',
    });
    expect(items[2]).toMatchObject({
      kind: 'thread',
      title: 'Weekend plans',
      path: '/thread/thread-1',
    });
    expect(items[3]).toMatchObject({
      kind: 'album',
      title: 'Ski trip',
      subtitle: 'New album · 0 photos',
      path: '/photos?eventId=event-1',
      authorName: 'Hr. Lins',
    });
  });

  it('adds a photo-drop item when photos arrive after the album', () => {
    const items = buildActivityItems({
      members,
      photoEvents: [
        buildSummary({
          photoCount: 4,
          created_at: '2026-09-01T10:00:00.000Z',
          latestPhotoAt: '2026-09-01T12:00:00.000Z',
        }),
      ],
      polls: [],
      threads: [],
    });

    expect(items.map((item) => item.kind)).toEqual(['photos', 'album']);
    expect(items[0]).toMatchObject({
      kind: 'photos',
      subtitle: '4 photos added',
      path: '/photos?eventId=event-1',
    });
  });

  it('does not duplicate a photo drop that landed with album creation', () => {
    const items = buildActivityItems({
      members,
      photoEvents: [
        buildSummary({
          photoCount: 2,
          created_at: '2026-09-01T10:00:00.000Z',
          latestPhotoAt: '2026-09-01T10:00:10.000Z',
        }),
      ],
      polls: [],
      threads: [],
    });

    expect(items.map((item) => item.kind)).toEqual(['album']);
  });

  it('marks closed polls as locked plan activity', () => {
    const items = buildActivityItems({
      members,
      photoEvents: [],
      polls: [buildPoll({ id: 'p2', title: 'BBQ', status: 'closed', created_at: '2026-09-05T10:00:00.000Z' })],
      threads: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'plan-lock-p2',
      kind: 'plan_lock',
      subtitle: 'Date locked',
      path: '/plan?pollId=p2',
    });
  });

  it('skips host rows without an assigned member and honors limit', () => {
    const items = buildActivityItems({
      members,
      photoEvents: [],
      polls: [
        buildPoll({ id: 'a', created_at: '2026-09-08T10:00:00.000Z' }),
        buildPoll({ id: 'b', created_at: '2026-09-07T10:00:00.000Z' }),
      ],
      threads: [],
      hostAssignments: [buildHostAssignment({ assigned_member_id: null })],
      limit: 1,
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('poll-a');
  });

  it('includes user feed posts with tag subtitles', () => {
    const items = buildActivityItems({
      members,
      photoEvents: [],
      polls: [],
      threads: [],
      feedPosts: [
        {
          id: 'post-1',
          group_id: 'group-1',
          author_id: 'user-1',
          body: 'Hello GSL',
          image_path: null,
          tag_all: true,
          taggedUserIds: [],
          imageUri: null,
          created_at: '2026-09-09T10:00:00.000Z',
        },
      ],
    });

    expect(items[0]).toMatchObject({
      id: 'post-post-1',
      kind: 'post',
      title: 'Hello GSL',
      subtitle: 'Tagged everyone',
      path: '/',
      authorName: 'Hr. Lins',
      authorId: 'user-1',
      sourceId: 'post-1',
      imagePath: null,
    });
  });
});

describe('activityKindLabel', () => {
  it('maps kinds to chrome labels', () => {
    expect(activityKindLabel('album')).toBe('Album');
    expect(activityKindLabel('photos')).toBe('Photos');
    expect(activityKindLabel('poll')).toBe('Plan');
    expect(activityKindLabel('plan_lock')).toBe('Plan');
    expect(activityKindLabel('thread')).toBe('Chat');
    expect(activityKindLabel('host')).toBe('Hosts');
    expect(activityKindLabel('post')).toBe('Post');
  });
});
