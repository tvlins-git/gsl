import type { Poll, PollResponse } from './database.types';
import { isLocalMode, localStore } from './local-store';
import { summarizePollAcceptance, type PollResponseInput } from './polls';
import { supabase } from './supabase';

export async function loadPollSummaries(
  polls: Poll[],
  memberNamesById: Record<string, string>
): Promise<Record<string, string>> {
  if (polls.length === 0) return {};

  if (isLocalMode()) {
    return localStore.getPollSummaries(polls, memberNamesById);
  }

  const pollIds = polls.map((p) => p.id);
  const { data: slots } = await supabase.from('poll_slots').select('id, poll_id').in('poll_id', pollIds);
  const slotList = slots ?? [];
  const slotIds = slotList.map((s) => s.id);

  let responses: PollResponse[] = [];
  if (slotIds.length > 0) {
    const { data } = await supabase
      .from('poll_responses')
      .select('slot_id, member_id, response')
      .in('slot_id', slotIds);
    responses = (data ?? []) as PollResponse[];
  }

  const slotsByPoll = new Map<string, string[]>();
  for (const slot of slotList) {
    const list = slotsByPoll.get(slot.poll_id) ?? [];
    list.push(slot.id);
    slotsByPoll.set(slot.poll_id, list);
  }

  const summaries: Record<string, string> = {};
  for (const poll of polls) {
    const pollSlotIds = new Set(slotsByPoll.get(poll.id) ?? []);
    const pollResponses: PollResponseInput[] = responses
      .filter((r) => pollSlotIds.has(r.slot_id))
      .map((r) => ({
        slotId: r.slot_id,
        memberId: r.member_id,
        response: r.response as PollResponseInput['response'],
      }));
    summaries[poll.id] = summarizePollAcceptance(pollResponses, memberNamesById);
  }

  return summaries;
}

export async function deletePoll(pollId: string) {
  if (isLocalMode()) {
    await localStore.deletePoll(pollId);
    return;
  }

  const { error } = await supabase.from('polls').delete().eq('id', pollId);
  if (error) throw error;
}
