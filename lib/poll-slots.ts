import type { PollSlot } from './database.types';
import { isLocalMode, localStore } from './local-store';
import type { PollSlotTimes } from './polls';
import { supabase } from './supabase';

export async function appendPollSlots(pollId: string, slots: PollSlotTimes[]): Promise<PollSlot[]> {
  if (slots.length === 0) return [];
  if (isLocalMode()) {
    return localStore.appendPollSlots(pollId, slots);
  }

  const { data, error } = await supabase
    .from('poll_slots')
    .insert(slots.map((slot) => ({ poll_id: pollId, starts_at: slot.startsAt, ends_at: slot.endsAt })))
    .select('*');
  if (error) throw error;
  return data ?? [];
}

export async function updatePollSlotTimes(slotId: string, times: PollSlotTimes): Promise<PollSlot> {
  if (isLocalMode()) {
    return localStore.updatePollSlotTimes(slotId, times);
  }

  const { data, error } = await supabase
    .from('poll_slots')
    .update({ starts_at: times.startsAt, ends_at: times.endsAt })
    .eq('id', slotId)
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('Could not update slot');
  return data;
}

export async function removePollSlot(slotId: string): Promise<void> {
  if (isLocalMode()) {
    await localStore.removePollSlot(slotId);
    return;
  }

  const { error } = await supabase.from('poll_slots').delete().eq('id', slotId);
  if (error) throw error;
}
