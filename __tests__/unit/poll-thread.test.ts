import { isLocalMode, localStore } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';
import {
  defaultPollThreadMessage,
  formatNameList,
  membersWithNoPollResponse,
  planPollThreadAudience,
  pollAnswerStatusLine,
  pollThreadName,
  pollThreadResultNotice,
  startPollThread,
  threadPushBody,
  unansweredPushBody,
} from '@/lib/poll-thread';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {
    findThreadByPoll: jest.fn(),
    createThread: jest.fn(),
    addMessage: jest.fn(),
    getPoll: jest.fn(),
    getPolls: jest.fn(),
  },
}));

const members = [
  { id: 'm1', userId: 'u1' },
  { id: 'm2', userId: 'u2' },
  { id: 'm3', userId: 'u3' },
];

describe('poll thread helpers', () => {
  it('formats name lists', () => {
    expect(formatNameList(['Ada'])).toBe('Ada');
    expect(formatNameList(['Ada', 'Bea'])).toBe('Ada and Bea');
    expect(formatNameList(['Ada', 'Bea', 'Cal'])).toBe('Ada, Bea, and Cal');
  });

  it('names the thread after the poll', () => {
    expect(pollThreadName('  Dinner  ')).toBe('Dinner');
    expect(pollThreadName('   ')).toBe('Poll');
  });

  it('finds members who have not answered, excluding the sender', () => {
    const people = [
      { id: 'm1', name: 'Hr. Lins' },
      { id: 'm2', name: 'Ada' },
      { id: 'm3', name: 'Bea' },
    ];
    const waiting = membersWithNoPollResponse(
      people,
      [{ memberId: 'm3', slotId: 's1', response: 'yes' as const }],
      ['m1']
    );
    expect(waiting.map((person) => person.name)).toEqual(['Ada']);
  });

  it('describes who still needs to answer', () => {
    expect(
      pollAnswerStatusLine({
        memberCount: 3,
        unansweredNames: ['Ada', 'Bea'],
        senderHasAnswered: true,
      })
    ).toBe("Ada and Bea haven't answered yet.");
    expect(
      pollAnswerStatusLine({ memberCount: 1, unansweredNames: [], senderHasAnswered: false })
    ).toBe("You're the only person in this group.");
    expect(
      pollAnswerStatusLine({ memberCount: 3, unansweredNames: [], senderHasAnswered: true })
    ).toBe('Everyone has answered.');
  });

  it('drafts a nudge that names the people still out', () => {
    expect(defaultPollThreadMessage('Test', ['Ada'])).toBe('Still waiting on Ada to answer "Test".');
    expect(defaultPollThreadMessage('Test', [])).toBe('Let\'s sort out "Test".');
  });

  it('includes everyone and pushes unanswered people with a separate reminder', () => {
    const audience = planPollThreadAudience({
      members,
      unansweredMemberIds: ['m2', 'm1'],
      senderUserId: 'u1',
      pushUnanswered: true,
    });
    expect(audience.memberIds).toEqual(['m1', 'm2', 'm3']);
    expect(audience.nudgeUserIds).toEqual(['u2']);
    expect(audience.notifyUserIds).toEqual(['u3']);
  });

  it('limits the chat push to people tagged in the message', () => {
    const audience = planPollThreadAudience({
      members,
      unansweredMemberIds: ['m2'],
      senderUserId: 'u1',
      pushUnanswered: false,
      message: 'hi @Bea',
      mentionMembers: [
        { user_id: 'u1', display_name: 'Hr. Lins' },
        { user_id: 'u2', display_name: 'Ada' },
        { user_id: 'u3', display_name: 'Bea' },
      ],
    });
    expect(audience.notifyUserIds).toEqual(['u3']);
    expect(audience.nudgeUserIds).toEqual([]);
  });

  it('keeps the unanswered reminder when the message also tags someone else', () => {
    const audience = planPollThreadAudience({
      members,
      unansweredMemberIds: ['m2'],
      senderUserId: 'u1',
      pushUnanswered: true,
      message: '@Bea can you check with Ada?',
      mentionMembers: [
        { user_id: 'u2', display_name: 'Ada' },
        { user_id: 'u3', display_name: 'Bea' },
      ],
    });
    expect(audience.nudgeUserIds).toEqual(['u2']);
    expect(audience.notifyUserIds).toEqual(['u3']);
  });

  it('sends a normal chat push to everyone else when the reminder is off', () => {
    const audience = planPollThreadAudience({
      members,
      unansweredMemberIds: ['m2'],
      senderUserId: 'u1',
      pushUnanswered: false,
    });
    expect(audience.nudgeUserIds).toEqual([]);
    expect(audience.notifyUserIds).toEqual(['u2', 'u3']);
  });

  it('builds push copy', () => {
    expect(unansweredPushBody('Hr. Lins', 'Test')).toBe('Hr. Lins: Please answer "Test"');
    expect(threadPushBody('Hr. Lins', ' Hello ')).toBe('Hr. Lins: Hello');
    expect(pollThreadResultNotice({ created: true, nudgeNames: ['Ada'], deliveredPush: true })).toBe(
      'Thread is in Chat. Pushed Ada to answer.'
    );
    expect(
      pollThreadResultNotice({ created: false, nudgeNames: ['Ada'], deliveredPush: false })
    ).toBe('Sent in the poll thread. Reminder for Ada is in the thread.');
  });
});

describe('startPollThread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(true);
  });

  it('creates one linked thread, posts the message, and reuses it later', async () => {
    (localStore.findThreadByPoll as jest.Mock).mockResolvedValueOnce(null);
    (localStore.createThread as jest.Mock).mockResolvedValue({
      id: 'thread-1',
      group_id: 'g1',
      name: 'Test',
      created_by: 'u1',
      poll_id: 'poll-1',
      created_at: '2026-09-26T00:00:00.000Z',
    });

    const created = await startPollThread({
      groupId: 'g1',
      pollId: 'poll-1',
      pollTitle: 'Test',
      senderUserId: 'u1',
      senderName: 'Hr. Lins',
      members: [
        { id: 'm1', user_id: 'u1', display_name: 'Hr. Lins' },
        { id: 'm2', user_id: 'u2', display_name: 'Ada' },
      ],
      unanswered: [{ id: 'm2', user_id: 'u2', display_name: 'Ada' }],
      message: 'Still waiting on Ada to answer "Test".',
      pushUnanswered: true,
    });

    expect(localStore.createThread).toHaveBeenCalledWith('g1', 'Test', 'u1', 'poll-1');
    expect(localStore.addMessage).toHaveBeenCalledWith(
      'thread-1',
      'u1',
      'Still waiting on Ada to answer "Test".'
    );
    expect(created.created).toBe(true);
    expect(created.notice).toBe('Thread is in Chat. Reminder for Ada is in the thread.');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();

    (localStore.findThreadByPoll as jest.Mock).mockResolvedValueOnce(created.thread);
    const again = await startPollThread({
      groupId: 'g1',
      pollId: 'poll-1',
      pollTitle: 'Test',
      senderUserId: 'u1',
      senderName: 'Hr. Lins',
      members: [
        { id: 'm1', user_id: 'u1', display_name: 'Hr. Lins' },
        { id: 'm2', user_id: 'u2', display_name: 'Ada' },
      ],
      unanswered: [{ id: 'm2', user_id: 'u2', display_name: 'Ada' }],
      message: 'One more nudge',
      pushUnanswered: true,
    });

    expect(localStore.createThread).toHaveBeenCalledTimes(1);
    expect(again.created).toBe(false);
    expect(again.thread.id).toBe('thread-1');
  });

  it('pushes unanswered people separately from everyone else', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(false);
    const thread = {
      id: 'thread-9',
      group_id: 'g1',
      name: 'Test',
      created_by: 'u1',
      poll_id: 'poll-1',
      created_at: '2026-09-26T00:00:00.000Z',
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'threads') {
        const query = {
          select: () => query,
          insert: () => query,
          eq: () => query,
          order: () => query,
          limit: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: thread, error: null }),
        };
        return query;
      }
      if (table === 'thread_members') {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      return { insert: () => Promise.resolve({ error: null }) };
    });
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ error: null });

    const result = await startPollThread({
      groupId: 'g1',
      pollId: 'poll-1',
      pollTitle: 'Test',
      senderUserId: 'u1',
      senderName: 'Hr. Lins',
      members: [
        { id: 'm1', user_id: 'u1', display_name: 'Hr. Lins' },
        { id: 'm2', user_id: 'u2', display_name: 'Ada' },
        { id: 'm3', user_id: 'u3', display_name: 'Bea' },
      ],
      unanswered: [{ id: 'm2', user_id: 'u2', display_name: 'Ada' }],
      message: 'Still waiting on Ada to answer "Test".',
      pushUnanswered: true,
    });

    expect(result.notice).toBe('Thread is in Chat. Pushed Ada to answer.');
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(1, 'send-push', {
      body: {
        type: 'chat',
        group_id: 'g1',
        exclude_user_ids: ['u1'],
        user_ids: ['u2'],
        title: 'GSL',
        body: 'Hr. Lins: Please answer "Test"',
        data: { threadId: 'thread-9', pollId: 'poll-1' },
      },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(2, 'send-push', {
      body: expect.objectContaining({
        type: 'chat',
        user_ids: ['u3'],
        data: { threadId: 'thread-9', pollId: 'poll-1' },
      }),
    });
  });
});
