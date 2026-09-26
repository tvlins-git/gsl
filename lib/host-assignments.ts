import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export function canDeleteHostAssignment(
  updatedBy: string | null | undefined,
  currentUserId: string | null | undefined
) {
  return Boolean(updatedBy && currentUserId && updatedBy === currentUserId);
}

export async function deleteHostAssignment(input: {
  assignmentId: string;
  updatedBy: string;
  currentUserId: string;
}): Promise<void> {
  if (!canDeleteHostAssignment(input.updatedBy, input.currentUserId)) {
    throw new Error('You can only delete host assignments you set.');
  }

  if (isLocalMode()) {
    await localStore.deleteHostAssignment(input.assignmentId);
    return;
  }

  const { error } = await supabase.from('host_assignments').delete().eq('id', input.assignmentId);
  if (error) throw error;
}
