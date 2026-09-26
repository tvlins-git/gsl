import {
  canDeleteHostAssignment,
  deleteHostAssignment,
} from '@/lib/host-assignments';
import { isLocalMode, localStore } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {
    deleteHostAssignment: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('canDeleteHostAssignment', () => {
  it('only the user who set the assignment can delete', () => {
    expect(canDeleteHostAssignment('user-1', 'user-1')).toBe(true);
    expect(canDeleteHostAssignment('user-1', 'user-2')).toBe(false);
    expect(canDeleteHostAssignment(undefined, 'user-1')).toBe(false);
  });
});

describe('deleteHostAssignment', () => {
  beforeEach(() => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    (localStore.deleteHostAssignment as jest.Mock).mockClear();
  });

  it('deletes a local assignment for the updater', async () => {
    (localStore.deleteHostAssignment as jest.Mock).mockResolvedValue(undefined);
    await deleteHostAssignment({
      assignmentId: 'host-1',
      updatedBy: 'user-1',
      currentUserId: 'user-1',
    });
    expect(localStore.deleteHostAssignment).toHaveBeenCalledWith('host-1');
  });

  it('rejects delete from someone who did not set the assignment', async () => {
    await expect(
      deleteHostAssignment({
        assignmentId: 'host-1',
        updatedBy: 'user-1',
        currentUserId: 'user-2',
      })
    ).rejects.toThrow('You can only delete host assignments you set.');
    expect(localStore.deleteHostAssignment).not.toHaveBeenCalled();
  });

  it('deletes the remote row for the updater', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(false);
    const eq = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      delete: jest.fn(() => ({ eq })),
    });

    await deleteHostAssignment({
      assignmentId: 'host-1',
      updatedBy: 'user-1',
      currentUserId: 'user-1',
    });

    expect(supabase.from).toHaveBeenCalledWith('host_assignments');
    expect(eq).toHaveBeenCalledWith('id', 'host-1');
  });
});
