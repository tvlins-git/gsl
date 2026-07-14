import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { HostMonthRow } from '@/components/HostMonthRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import { generateMonthList } from '@/lib/hosts';
import { isLocalMode, localStore } from '@/lib/local-store';
import type { HostAssignment, Member } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';
export default function HostsScreen() {
  const { member } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<HostAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const months = generateMonthList(12);

  const loadData = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    if (isLocalMode()) {
      const [m, a] = await Promise.all([
        getGroupMembers(member.group_id),
        localStore.getHostAssignments(member.group_id),
      ]);
      setMembers(m);
      setAssignments(a);
    } else {
      const [m, { data: a }] = await Promise.all([
        getGroupMembers(member.group_id),
        supabase.from('host_assignments').select('*').eq('group_id', member.group_id),
      ]);
      setMembers(m);
      setAssignments(a ?? []);
    }
    setLoading(false);
  }, [member]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAssignment = (year: number, month: number) => {
    return assignments.find((a) => a.year === year && a.month === month)?.assigned_member_id ?? null;
  };

  const handleAssign = async (year: number, month: number, assignedMemberId: string | null) => {
    if (!member) return;

    if (isLocalMode()) {
      await localStore.upsertHostAssignment(member.group_id, year, month, assignedMemberId, member.user_id);
    } else {
      const existing = assignments.find((a) => a.year === year && a.month === month);

      if (existing) {
        await supabase
          .from('host_assignments')
          .update({
            assigned_member_id: assignedMemberId,
            updated_by: member.user_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('host_assignments').insert({
          group_id: member.group_id,
          year,
          month,
          assigned_member_id: assignedMemberId,
          updated_by: member.user_id,
        });
      }
    }

    await loadData();
  };

  if (loading) {
    return <Screen loading />;
  }

  return (
    <Screen>
      <FlatList
        data={months}
        keyExtractor={(item) => `${item.year}-${item.month}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.hint}>Tap a member to assign hosting duties for each month.</Text>
        }
        renderItem={({ item }) => (
          <HostMonthRow
            month={item}
            members={members}
            assignedMemberId={getAssignment(item.year, item.month)}
            onAssign={(id) => handleAssign(item.year, item.month, id)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  hint: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
