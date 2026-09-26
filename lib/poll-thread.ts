import type { Thread } from './database.types';
import { parseFeedMentions, type FeedMentionMember } from './feed-posts';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export interface PollThreadPerson {
  id: string;
  user_id: string;
  display_name: string;
}

export function pollThreadName(pollTitle: string): string {
  const title = pollTitle.trim();
  return title.length > 0 ? title : 'Poll';
}

export function formatNameList(names: string[]): string {
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
}

/** Members with no vote on any slot. `excludeMemberIds` drops the sender from nudge targets. */
export function membersWithNoPollResponse<T extends { id: string }>(
  members: T[],
  responses: { memberId: string }[],
  excludeMemberIds: string[] = []
): T[] {
  const answered = new Set(responses.map((response) => response.memberId));
  const exclude = new Set(excludeMemberIds);
  return members.filter((member) => !answered.has(member.id) && !exclude.has(member.id));
}

export function senderHasAnsweredPoll(
  senderMemberId: string,
  responses: { memberId: string }[]
): boolean {
  return responses.some((response) => response.memberId === senderMemberId);
}

export function pollAnswerStatusLine(input: {
  memberCount: number;
  unansweredNames: string[];
  senderHasAnswered: boolean;
}): string {
  if (input.unansweredNames.length === 1) {
    return `${input.unansweredNames[0]} hasn't answered yet.`;
  }
  if (input.unansweredNames.length > 1) {
    return `${formatNameList(input.unansweredNames)} haven't answered yet.`;
  }
  if (input.memberCount <= 1 && !input.senderHasAnswered) {
    return "You're the only person in this group.";
  }
  if (!input.senderHasAnswered) {
    return 'Everyone else has answered.';
  }
  return 'Everyone has answered.';
}

export function defaultPollThreadMessage(pollTitle: string, unansweredNames: string[]): string {
  const title = pollTitle.trim() || 'this poll';
  if (unansweredNames.length === 0) {
    return `Let's sort out "${title}".`;
  }
  return `Still waiting on ${formatNameList(unansweredNames)} to answer "${title}".`;
}

export interface PollThreadAudience {
  memberIds: string[];
  nudgeUserIds: string[];
  notifyUserIds: string[];
}

/** Everyone is in the thread. Unanswered people get the reminder push when asked; the rest get a normal chat push. */
export function planPollThreadAudience(input: {
  members: { id: string; userId: string }[];
  unansweredMemberIds: string[];
  senderUserId: string;
  pushUnanswered: boolean;
  message?: string;
  mentionMembers?: FeedMentionMember[];
}): PollThreadAudience {
  const memberIds = [...new Set(input.members.map((member) => member.id))];
  const unansweredIds = new Set(input.unansweredMemberIds);
  const nudgeUserIds = input.pushUnanswered
    ? [
        ...new Set(
          input.members
            .filter((member) => unansweredIds.has(member.id) && member.userId !== input.senderUserId)
            .map((member) => member.userId)
        ),
      ]
    : [];
  const nudgeSet = new Set(nudgeUserIds);
  let notifyUserIds = [
    ...new Set(
      input.members
        .map((member) => member.userId)
        .filter((userId) => userId !== input.senderUserId && !nudgeSet.has(userId))
    ),
  ];
  if (input.message && input.mentionMembers) {
    const tags = parseFeedMentions(input.message, input.mentionMembers);
    if (!tags.tagAll && tags.userIds.length > 0) {
      const mentioned = new Set(tags.userIds);
      notifyUserIds = notifyUserIds.filter((userId) => mentioned.has(userId));
    }
  }
  return { memberIds, nudgeUserIds, notifyUserIds };
}

export function unansweredPushBody(senderName: string, pollTitle: string): string {
  const title = pollTitle.trim() || 'a poll';
  return `${senderName}: Please answer "${title}"`;
}

export function threadPushBody(senderName: string, message: string): string {
  return `${senderName}: ${message.trim()}`;
}

export function pollThreadResultNotice(input: {
  created: boolean;
  nudgeNames: string[];
  deliveredPush: boolean;
}): string {
  const lead = input.created ? 'Thread is in Chat' : 'Sent in the poll thread';
  if (input.nudgeNames.length === 0) return `${lead}.`;
  const names = formatNameList(input.nudgeNames);
  if (input.deliveredPush) return `${lead}. Pushed ${names} to answer.`;
  return `${lead}. Reminder for ${names} is in the thread.`;
}

export interface StartPollThreadInput {
  groupId: string;
  pollId: string;
  pollTitle: string;
  senderUserId: string;
  senderName: string;
  members: PollThreadPerson[];
  unanswered: PollThreadPerson[];
  message: string;
  pushUnanswered: boolean;
}

export async function findPollThread(pollId: string): Promise<Thread | null> {
  if (isLocalMode()) return localStore.findThreadByPoll(pollId);
  return findRemotePollThread(pollId);
}

export async function getPollLinkTarget(pollId: string): Promise<{ id: string; title: string } | null> {
  if (isLocalMode()) {
    const poll = await localStore.getPoll(pollId);
    return poll ? { id: poll.id, title: poll.title } : null;
  }

  const { data, error } = await supabase.from('polls').select('id, title').eq('id', pollId).single();
  if (error || !data) return null;
  return { id: data.id, title: data.title };
}

export async function loadPollTitles(pollIds: string[], groupId: string): Promise<Record<string, string>> {
  const ids = [...new Set(pollIds.filter(Boolean))];
  if (ids.length === 0) return {};

  if (isLocalMode()) {
    const polls = await localStore.getPolls(groupId);
    const titles: Record<string, string> = {};
    for (const poll of polls) {
      if (ids.includes(poll.id)) titles[poll.id] = poll.title;
    }
    return titles;
  }

  const { data, error } = await supabase.from('polls').select('id, title').in('id', ids);
  if (error || !data) return {};
  return Object.fromEntries(data.map((poll) => [poll.id, poll.title]));
}

export async function startPollThread(input: StartPollThreadInput): Promise<{
  thread: Thread;
  created: boolean;
  notice: string;
}> {
  const message = input.message.trim();
  if (!message) throw new Error('Message is empty');

  const audience = planPollThreadAudience({
    members: input.members.map((member) => ({ id: member.id, userId: member.user_id })),
    unansweredMemberIds: input.unanswered.map((member) => member.id),
    senderUserId: input.senderUserId,
    pushUnanswered: input.pushUnanswered,
    message,
    mentionMembers: input.members.map((member) => ({
      user_id: member.user_id,
      display_name: member.display_name,
    })),
  });
  const nudgeNames = input.unanswered
    .filter((member) => audience.nudgeUserIds.includes(member.user_id))
    .map((member) => member.display_name);

  if (isLocalMode()) {
    const existing = await localStore.findThreadByPoll(input.pollId);
    const thread =
      existing ??
      (await localStore.createThread(
        input.groupId,
        pollThreadName(input.pollTitle),
        input.senderUserId,
        input.pollId
      ));
    await localStore.addMessage(thread.id, input.senderUserId, message);
    return {
      thread,
      created: !existing,
      notice: pollThreadResultNotice({ created: !existing, nudgeNames, deliveredPush: false }),
    };
  }

  let created = false;
  let thread = await findRemotePollThread(input.pollId);
  if (!thread) {
    const { data, error } = await supabase
      .from('threads')
      .insert({
        group_id: input.groupId,
        name: pollThreadName(input.pollTitle),
        created_by: input.senderUserId,
        poll_id: input.pollId,
      })
      .select('*')
      .single();
    if (error || !data) throw error ?? new Error('Could not create thread');
    thread = data;
    created = true;
  }

  if (audience.memberIds.length > 0) {
    const { error } = await supabase.from('thread_members').upsert(
      audience.memberIds.map((memberId) => ({ thread_id: thread.id, member_id: memberId })),
      { onConflict: 'thread_id,member_id' }
    );
    if (error) throw error;
  }

  const { error: messageError } = await supabase.from('messages').insert({
    thread_id: thread.id,
    sender_id: input.senderUserId,
    body: message,
  });
  if (messageError) throw messageError;

  const deliveredNudge =
    audience.nudgeUserIds.length > 0 &&
    (await sendThreadPush({
      groupId: input.groupId,
      userIds: audience.nudgeUserIds,
      excludeUserId: input.senderUserId,
      body: unansweredPushBody(input.senderName, input.pollTitle),
      threadId: thread.id,
      pollId: input.pollId,
    }));

  if (audience.notifyUserIds.length > 0) {
    await sendThreadPush({
      groupId: input.groupId,
      userIds: audience.notifyUserIds,
      excludeUserId: input.senderUserId,
      body: threadPushBody(input.senderName, message),
      threadId: thread.id,
      pollId: input.pollId,
    });
  }

  return {
    thread,
    created,
    notice: pollThreadResultNotice({
      created,
      nudgeNames,
      deliveredPush: deliveredNudge,
    }),
  };
}

async function findRemotePollThread(pollId: string): Promise<Thread | null> {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('poll_id', pollId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function sendThreadPush(input: {
  groupId: string;
  userIds: string[];
  excludeUserId: string;
  body: string;
  threadId: string;
  pollId: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        type: 'chat',
        group_id: input.groupId,
        exclude_user_ids: [input.excludeUserId],
        user_ids: input.userIds,
        title: 'GSL',
        body: input.body,
        data: { threadId: input.threadId, pollId: input.pollId },
      },
    });
    return !error;
  } catch {
    return false;
  }
}
