import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PollGrid } from '@/components/PollGrid';
import { PollSlotEditor } from '@/components/PollSlotEditor';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import { isLocalMode, localStore } from '@/lib/local-store';
import { deletePoll, loadPollSummaries } from '@/lib/poll-list';
import { computeSlotScores, formatSlotTime } from '@/lib/polls';
import type { Member, Poll, PollSlot } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { PollResponseValue } from '@/lib/polls';
import { sharedStyles, theme } from '@/constants/theme';

export default function PlanScreen() {
  const { member } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [slots, setSlots] = useState<PollSlot[]>([]);
  const [responses, setResponses] = useState<{ slotId: string; memberId: string; response: PollResponseValue }[]>([]);
  const [pollSummaries, setPollSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [slotError, setSlotError] = useState('');
  const [newSlots, setNewSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);

  const loadPolls = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const m = await getGroupMembers(member.group_id);
    const p = isLocalMode()
      ? await localStore.getPolls(member.group_id)
      : (await supabase.from('polls').select('*').eq('group_id', member.group_id).order('created_at', { ascending: false })).data ?? [];
    setMembers(m);
    setPolls(p);
    const names = Object.fromEntries(m.map((x) => [x.id, x.display_name]));
    setPollSummaries(await loadPollSummaries(p, names));
    setLoading(false);
  }, [member]);

  const loadPollDetail = useCallback(async (poll: Poll) => {
    const s = isLocalMode()
      ? await localStore.getPollSlots(poll.id)
      : (await supabase.from('poll_slots').select('*').eq('poll_id', poll.id)).data ?? [];
    const slotIds = s.map((x) => x.id);
    let r: { slot_id: string; member_id: string; response: string }[] = [];
    if (slotIds.length > 0) {
      r = isLocalMode()
        ? (await localStore.getPollResponses(slotIds)).map((x) => ({
            slot_id: x.slot_id,
            member_id: x.member_id,
            response: x.response,
          }))
        : (await supabase.from('poll_responses').select('slot_id, member_id, response').in('slot_id', slotIds)).data ?? [];
    }
    setSlots(s ?? []);
    setResponses(
      r.map((x) => ({
        slotId: x.slot_id,
        memberId: x.member_id,
        response: x.response as PollResponseValue,
      }))
    );
    setSelectedPoll(poll);
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const handleVote = async (slotId: string, response: PollResponseValue) => {
    if (!member) return;
    if (isLocalMode()) {
      await localStore.upsertPollResponse(slotId, member.id, response);
    } else {
      await supabase.from('poll_responses').upsert(
        { slot_id: slotId, member_id: member.id, response },
        { onConflict: 'slot_id,member_id' }
      );
    }
    if (selectedPoll) await loadPollDetail(selectedPoll);
    if (!selectedPoll) await loadPolls();
  };

  const handleDeletePoll = async (pollId: string) => {
    await deletePoll(pollId);
    if (selectedPoll?.id === pollId) {
      setSelectedPoll(null);
    }
    await loadPolls();
  };

  const handleCreatePoll = async () => {
    if (!member || !newTitle.trim() || newSlots.length === 0) return;

    if (isLocalMode()) {
      await localStore.createPoll(member.group_id, newTitle.trim(), member.user_id, newSlots);
    } else {
      const { data: poll } = await supabase
        .from('polls')
        .insert({ group_id: member.group_id, title: newTitle.trim(), created_by: member.user_id })
        .select()
        .single();

      if (poll) {
        await supabase.from('poll_slots').insert(
          newSlots.map((s) => ({ poll_id: poll.id, starts_at: s.startsAt, ends_at: s.endsAt }))
        );
        await supabase.functions.invoke('send-push', {
          body: {
            type: 'poll',
            group_id: member.group_id,
            exclude_user_ids: [member.user_id],
            title: 'GSL',
            body: `New poll: ${newTitle}`,
            data: { pollId: poll.id },
          },
        }).catch(() => undefined);
      }
    }

    setShowCreate(false);
    setNewTitle('');
    setSlotError('');
    setNewSlots([]);
    await loadPolls();
  };

  const openCreateModal = () => {
    setNewTitle('');
    setSlotError('');
    setNewSlots([]);
    setShowCreate(true);
  };

  const slotScores = computeSlotScores(
    slots.map((s) => s.id),
    responses,
    members.length
  );

  if (loading) {
    return <Screen loading />;
  }

  if (selectedPoll) {
    return (
      <ScrollView style={sharedStyles.screen} contentContainerStyle={styles.detailContent}>
        <Pressable onPress={() => setSelectedPoll(null)} style={styles.backBtn}>
          <Text style={styles.back}>← Back to polls</Text>
        </Pressable>
        <View style={styles.detailHeader}>
          <View style={styles.detailTitleBlock}>
            <Text style={styles.pollTitle}>{selectedPoll.title}</Text>
            <StatusBadge status={selectedPoll.status} />
          </View>
          <Pressable onPress={() => handleDeletePoll(selectedPoll.id)} testID="delete-poll-detail">
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
        <View style={[styles.gridCard, sharedStyles.card]}>
          <PollGrid
            members={members}
            slots={slots.map((s) => ({ id: s.id, startsAt: s.starts_at, endsAt: s.ends_at }))}
            responses={responses}
            currentMemberId={member?.id}
            onVote={handleVote}
            readOnly={selectedPoll.status === 'closed'}
          />
        </View>
        <View style={[styles.results, sharedStyles.card]}>
          <Text style={styles.resultsTitle}>Best slots</Text>
          {slotScores.map((score) => {
            const slot = slots.find((s) => s.id === score.slotId);
            if (!slot) return null;
            return (
              <View
                key={score.slotId}
                style={[styles.resultRow, score.everyoneAvailable && styles.resultHighlightRow]}
              >
                <Text style={[styles.resultRowText, score.everyoneAvailable && styles.resultHighlight]}>
                  {formatSlotTime(slot.starts_at, slot.ends_at)}
                </Text>
                <Text style={styles.resultMeta}>
                  {score.yesCount} yes · {score.maybeCount} maybe
                  {score.everyoneAvailable ? ' · Everyone free!' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <Screen>
      <Pressable style={[styles.createBtn, sharedStyles.primaryBtn]} onPress={openCreateModal} testID="create-poll-btn">
        <Text style={sharedStyles.primaryBtnText}>+ New poll</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.listContent}>
        {polls.length === 0 && (
          <Text style={sharedStyles.empty}>No polls yet. Create one to find a time that works.</Text>
        )}
        {polls.map((poll) => (
          <View key={poll.id} style={[styles.pollCard, sharedStyles.card]}>
            <Pressable style={styles.pollCardMain} onPress={() => loadPollDetail(poll)}>
              <Text style={styles.pollCardTitle}>{poll.title}</Text>
              <Text style={styles.pollCardSummary}>
                {pollSummaries[poll.id] ?? 'Loading…'}
              </Text>
            </Pressable>
            <View style={styles.pollCardStatus}>
              <StatusBadge status={poll.status} />
            </View>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDeletePoll(poll.id)}
              testID={`delete-poll-${poll.id}`}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={sharedStyles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={sharedStyles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={sharedStyles.modalTitle}>Create poll</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Poll title (e.g. September dinner)"
                placeholderTextColor={theme.colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <PollSlotEditor
                slots={newSlots}
                onSlotsChange={setNewSlots}
                slotError={slotError}
                onSlotError={setSlotError}
              />
              <Pressable
                style={[
                  sharedStyles.primaryBtn,
                  (newSlots.length === 0 || !newTitle.trim()) && styles.createBtnDisabled,
                ]}
                onPress={handleCreatePoll}
                disabled={newSlots.length === 0 || !newTitle.trim()}
              >
                <Text style={sharedStyles.primaryBtnText}>
                  Create poll{newSlots.length > 0 ? ` (${newSlots.length} slots)` : ''}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  createBtn: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  createBtnDisabled: { opacity: 0.45 },
  pollCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  pollCardMain: { flex: 1, padding: theme.spacing.lg },
  pollCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  pollCardSummary: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  pollCardStatus: {
    justifyContent: 'center',
    paddingRight: theme.spacing.md,
  },
  deleteBtn: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  deleteText: { color: theme.colors.danger, fontWeight: '600', fontSize: 14 },
  detailContent: { paddingBottom: theme.spacing.xxl },
  backBtn: { padding: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  back: { color: theme.colors.accent, fontSize: 15, fontWeight: '600' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  detailTitleBlock: { flex: 1, gap: theme.spacing.sm },
  pollTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  gridCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, overflow: 'hidden' },
  results: { marginHorizontal: theme.spacing.lg, padding: theme.spacing.lg },
  resultsTitle: { fontWeight: '700', fontSize: 15, color: theme.colors.text, marginBottom: theme.spacing.md },
  resultRow: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderLight,
  },
  resultHighlightRow: {
    backgroundColor: theme.colors.successSoft,
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderTopWidth: 0,
  },
  resultRowText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  resultMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  resultHighlight: { color: theme.colors.success },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cancelBtn: { paddingVertical: theme.spacing.sm },
  cancel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 15 },
});
