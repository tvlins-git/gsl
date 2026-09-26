import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardSheet } from '@/components/KeyboardSheet';
import { PollGrid } from '@/components/PollGrid';
import { PollSlotEditor } from '@/components/PollSlotEditor';
import { PollThreadSheet } from '@/components/PollThreadSheet';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatRelativeTime } from '@/lib/time';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import {
  describeInviteResult,
  getCalendarInvitees,
  sendCalendarInvites,
} from '@/lib/calendar-invite';
import { isLocalMode, localStore } from '@/lib/local-store';
import { deletePoll, loadPollSummaries, partitionPolls } from '@/lib/poll-list';
import { computeSlotScores, formatSlotTime } from '@/lib/polls';
import {
  findPollThread,
  membersWithNoPollResponse,
  pollAnswerStatusLine,
  senderHasAnsweredPoll,
  startPollThread,
} from '@/lib/poll-thread';
import type { Member, Poll, PollSlot, Thread } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { PollResponseValue } from '@/lib/polls';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function PlanScreen() {
  const { member } = useAuth();
  const { pollId } = useLocalSearchParams<{ pollId?: string }>();
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
  const [lockingSlotId, setLockingSlotId] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [slotPickerActive, setSlotPickerActive] = useState(false);
  const [linkedThread, setLinkedThread] = useState<Thread | null>(null);
  const [showThreadComposer, setShowThreadComposer] = useState(false);
  const [startingThread, setStartingThread] = useState(false);
  const [threadNotice, setThreadNotice] = useState('');
  const insets = useSafeAreaInsets();

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
    const [s, linked] = await Promise.all([
      isLocalMode()
        ? localStore.getPollSlots(poll.id)
        : supabase
            .from('poll_slots')
            .select('*')
            .eq('poll_id', poll.id)
            .then(({ data }) => data ?? []),
      findPollThread(poll.id).catch(() => null),
    ]);
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
    setThreadNotice('');
    setLinkedThread(linked);
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  useFocusEffect(
    useCallback(() => {
      if (!member) return;
      void getGroupMembers(member.group_id).then(setMembers);
    }, [member])
  );

  useEffect(() => {
    if (!pollId || polls.length === 0 || selectedPoll?.id === pollId) return;
    const match = polls.find((poll) => poll.id === pollId);
    if (match) void loadPollDetail(match);
  }, [pollId, polls, loadPollDetail, selectedPoll?.id]);

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

  const closePollDetail = () => {
    setSelectedPoll(null);
    setLinkedThread(null);
    setShowThreadComposer(false);
    setThreadNotice('');
    if (pollId) router.setParams({ pollId: '' });
  };

  const handleDeletePoll = async (pollIdToDelete: string) => {
    await deletePoll(pollIdToDelete);
    if (selectedPoll?.id === pollIdToDelete) {
      closePollDetail();
    }
    await loadPolls();
  };

  const unansweredMembers = membersWithNoPollResponse(
    members,
    responses,
    member ? [member.id] : []
  );
  const answerStatusLine = pollAnswerStatusLine({
    memberCount: members.length,
    unansweredNames: unansweredMembers.map((person) => person.display_name),
    senderHasAnswered: member ? senderHasAnsweredPoll(member.id, responses) : true,
  });

  const handleStartThread = async (draft: { message: string; pushUnanswered: boolean }) => {
    if (!member || !selectedPoll) return;
    setStartingThread(true);
    try {
      const result = await startPollThread({
        groupId: member.group_id,
        pollId: selectedPoll.id,
        pollTitle: selectedPoll.title,
        senderUserId: member.user_id,
        senderName: member.display_name,
        members,
        unanswered: unansweredMembers,
        message: draft.message,
        pushUnanswered: draft.pushUnanswered,
      });
      setLinkedThread(result.thread);
      setThreadNotice(result.notice);
      setShowThreadComposer(false);
      router.navigate(`/thread/${result.thread.id}`);
    } catch {
      setThreadNotice('Could not start the thread. Try again.');
    } finally {
      setStartingThread(false);
    }
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

  const performLockAndInvite = async (slot: PollSlot) => {
    if (!member || !selectedPoll) return;

    setLockingSlotId(slot.id);
    setInviteMessage('');
    try {
      const refreshedMembers = await getGroupMembers(member.group_id);
      setMembers(refreshedMembers);

      const { invitees, skippedWithoutEmail } = getCalendarInvitees(
        refreshedMembers,
        responses,
        slot.id
      );

      let locked: Poll;
      if (isLocalMode()) {
        locked = await localStore.lockPoll(selectedPoll.id, slot.id);
      } else {
        const { data, error } = await supabase
          .from('polls')
          .update({ status: 'closed', chosen_slot_id: slot.id })
          .eq('id', selectedPoll.id)
          .select()
          .single();
        if (error || !data) throw error ?? new Error('Failed to lock poll');
        locked = data;

        await supabase.functions
          .invoke('send-push', {
            body: {
              type: 'poll',
              group_id: member.group_id,
              exclude_user_ids: [member.user_id],
              title: 'GSL',
              body: `Date locked: ${selectedPoll.title}`,
              data: { pollId: selectedPoll.id },
            },
          })
          .catch(() => undefined);
      }

      const delivery = await sendCalendarInvites({
        pollId: locked.id,
        slotId: slot.id,
        title: locked.title,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        invitees,
        organizerEmail: member.contact_email ?? undefined,
        organizerName: member.display_name,
        invokeServer: isLocalMode()
          ? undefined
          : async (body) => {
              const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
                body,
              });
              if (error) throw error;
              return data as { emailed?: boolean } | null;
            },
      });

      setInviteMessage(
        describeInviteResult({
          inviteeCount: invitees.length,
          skippedWithoutEmail,
          delivery,
        })
      );
      await loadPollDetail(locked);
      await loadPolls();
    } catch {
      setInviteMessage('Could not lock this date. Try again.');
    } finally {
      setLockingSlotId(null);
    }
  };

  const handleLockDate = (slot: PollSlot) => {
    if (!selectedPoll || selectedPoll.status === 'closed') return;

    const { invitees, skippedWithoutEmail } = getCalendarInvitees(members, responses, slot.id);
    const when = formatSlotTime(slot.starts_at, slot.ends_at);
    const detail =
      invitees.length > 0
        ? `Send a calendar invite to ${invitees.length} person(s) who said yes or maybe${
            skippedWithoutEmail > 0 ? ` (${skippedWithoutEmail} skipped — no email)` : ''
          }.`
        : skippedWithoutEmail > 0
          ? `${skippedWithoutEmail} said yes/maybe but none have an email in Settings yet. The date will still be locked.`
          : 'No one said yes or maybe for this slot yet. The date will still be locked.';

    const message = `${when}\n\n${detail}`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Lock this date?\n\n${message}`)) {
        void performLockAndInvite(slot);
      }
      return;
    }

    Alert.alert('Lock this date?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock & invite',
        onPress: () => {
          void performLockAndInvite(slot);
        },
      },
    ]);
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

  const chosenSlot = selectedPoll?.chosen_slot_id
    ? slots.find((s) => s.id === selectedPoll.chosen_slot_id)
    : undefined;

  if (loading) {
    return <Screen loading />;
  }

  if (selectedPoll) {
    return (
      <View style={sharedStyles.screen}>
      <ScrollView style={sharedStyles.screen} contentContainerStyle={styles.detailContent}>
        <Pressable onPress={closePollDetail} style={styles.backBtn}>
          <Text style={styles.back}>← Back to polls</Text>
        </Pressable>
        <View style={styles.detailHeader}>
          <Text style={styles.pollTitle}>{selectedPoll.title}</Text>
          <View style={styles.detailMetaRow}>
            <StatusBadge status={selectedPoll.status === 'closed' ? 'locked' : selectedPoll.status} />
            <Text style={styles.detailByline}>
              {members.find((item) => item.user_id === selectedPoll.created_by)?.display_name
                ?? 'Friend'}{' '}
              · {formatRelativeTime(selectedPoll.created_at)}
            </Text>
            <Pressable onPress={() => handleDeletePoll(selectedPoll.id)} testID="delete-poll-detail">
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        </View>
        {chosenSlot ? (
          <View style={[styles.lockedBanner, sharedStyles.card]}>
            <Text style={styles.lockedTitle}>Locked date</Text>
            <Text style={styles.lockedWhen}>
              {formatSlotTime(chosenSlot.starts_at, chosenSlot.ends_at)}
            </Text>
          </View>
        ) : null}
        {inviteMessage ? <Text style={styles.inviteMessage}>{inviteMessage}</Text> : null}
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
            const isChosen = selectedPoll.chosen_slot_id === slot.id;
            const isLocking = lockingSlotId === slot.id;
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
                  {isChosen ? ' · Locked' : ''}
                </Text>
                {selectedPoll.status === 'open' ? (
                  <Pressable
                    style={[styles.lockBtn, isLocking && styles.lockBtnDisabled]}
                    onPress={() => handleLockDate(slot)}
                    disabled={!!lockingSlotId}
                    testID={`lock-slot-${slot.id}`}
                  >
                    {isLocking ? (
                      <ActivityIndicator color={theme.colors.onPrimary} />
                    ) : (
                      <Text style={styles.lockBtnText}>Lock date & send invite</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={[styles.threadCard, sharedStyles.card]}>
          <Text style={styles.resultsTitle}>Group chat</Text>
          <Text style={styles.threadStatus}>{answerStatusLine}</Text>
          <Text style={styles.threadHint}>
            Includes everyone. The thread links back to this poll and shows up in Chat.
          </Text>
          {threadNotice ? <Text style={styles.threadNotice}>{threadNotice}</Text> : null}
          <Pressable
            style={sharedStyles.primaryBtn}
            onPress={() => setShowThreadComposer(true)}
            testID="start-poll-thread"
          >
            <Text style={sharedStyles.primaryBtnText}>
              {linkedThread ? 'Message the thread' : 'Message the group'}
            </Text>
          </Pressable>
          {linkedThread ? (
            <Pressable
              style={sharedStyles.secondaryBtn}
              onPress={() => router.navigate(`/thread/${linkedThread.id}`)}
              testID="open-poll-thread"
            >
              <Text style={sharedStyles.secondaryBtnText}>Open chat</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <PollThreadSheet
        visible={showThreadComposer}
        pollTitle={selectedPoll.title}
        members={members}
        unansweredNames={unansweredMembers.map((person) => person.display_name)}
        statusLine={answerStatusLine}
        existingThread={!!linkedThread}
        submitting={startingThread}
        onClose={() => setShowThreadComposer(false)}
        onSubmit={(draft) => {
          void handleStartThread(draft);
        }}
      />
      </View>
    );
  }

  const { open: openPolls, locked: lockedPolls } = partitionPolls(polls);

  const renderPollRow = (poll: Poll) => (
    <View key={poll.id} style={styles.pollRow}>
      <Pressable
        style={styles.pollRowMain}
        onPress={() => loadPollDetail(poll)}
        testID={`poll-row-${poll.id}`}
      >
        <View style={styles.pollRowTop}>
          <Text style={styles.pollRowTitle} numberOfLines={1}>
            {poll.title}
          </Text>
          <StatusBadge status={poll.status === 'closed' ? 'locked' : poll.status} />
        </View>
        <Text style={styles.pollRowMeta} numberOfLines={2}>
          {pollSummaries[poll.id] ?? 'Loading…'} · {formatRelativeTime(poll.created_at)}
        </Text>
      </Pressable>
      <Pressable
        style={styles.deleteBtn}
        onPress={() => handleDeletePoll(poll.id)}
        testID={`delete-poll-${poll.id}`}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen>
      <View style={sharedStyles.toolBar}>
        <Text style={sharedStyles.toolBarTitle}>Polls</Text>
        <Pressable style={sharedStyles.toolBarAction} onPress={openCreateModal} testID="create-poll-btn">
          <Text style={sharedStyles.toolBarActionText}>New poll</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.listContent}>
        {polls.length === 0 && (
          <Text style={sharedStyles.empty}>No polls yet. Create one and vote on dates.</Text>
        )}
        {openPolls.length > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>Open</Text>
            <View style={styles.pollTable}>{openPolls.map(renderPollRow)}</View>
          </View>
        ) : null}
        {lockedPolls.length > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>Locked</Text>
            <View style={styles.pollTable}>{lockedPolls.map(renderPollRow)}</View>
          </View>
        ) : null}
      </ScrollView>

      <KeyboardSheet
        visible={showCreate}
        onRequestClose={() => setShowCreate(false)}
        testID="create-poll-scroll"
        sheetStyle={styles.createSheet}
        contentContainerStyle={styles.createSheetContent}
        footerStyle={{ paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }}
        nestedScrollEnabled
        scrollEnabled={!slotPickerActive}
        footer={
          <>
            <Pressable
              style={[
                sharedStyles.primaryBtn,
                (newSlots.length === 0 || !newTitle.trim()) && styles.createBtnDisabled,
              ]}
              onPress={handleCreatePoll}
              disabled={newSlots.length === 0 || !newTitle.trim()}
              testID="create-poll-submit"
            >
              <Text style={sharedStyles.primaryBtnText}>
                Create poll{newSlots.length > 0 ? ` (${newSlots.length} slots)` : ''}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn} testID="create-poll-cancel">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </>
        }
      >
        <View style={styles.modalHandle} />
        <Text style={sharedStyles.modalTitle}>Create poll</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Poll title (e.g. September dinner)"
          placeholderTextColor={theme.colors.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          testID="create-poll-title"
        />
        <PollSlotEditor
          slots={newSlots}
          onSlotsChange={setNewSlots}
          slotError={slotError}
          onSlotError={setSlotError}
          onPickerInteractionChange={setSlotPickerActive}
        />
      </KeyboardSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    ...feedColumn,
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
  },
  sectionLabel: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  pollTable: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  pollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  pollRowMain: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    gap: 4,
  },
  pollRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pollRowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pollRowMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  createBtnDisabled: { opacity: 0.45 },
  deleteBtn: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  deleteText: { color: theme.colors.danger, fontWeight: '600', fontSize: 13 },
  detailContent: { paddingBottom: theme.spacing.xxl },
  backBtn: { padding: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  back: { color: theme.colors.accent, fontSize: 15, fontWeight: '600' },
  detailHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  detailByline: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pollTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  lockedBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  lockedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 4,
  },
  lockedWhen: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  inviteMessage: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  gridCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, overflow: 'hidden' },
  results: { marginHorizontal: theme.spacing.lg, padding: theme.spacing.lg },
  threadCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  threadStatus: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  threadHint: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary },
  threadNotice: { fontSize: 13, lineHeight: 18, color: theme.colors.text },
  resultsTitle: { fontWeight: '700', fontSize: 15, color: theme.colors.text, marginBottom: theme.spacing.md },
  resultRow: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderLight,
    gap: theme.spacing.sm,
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
  lockBtn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    minWidth: 180,
    alignItems: 'center',
  },
  lockBtnDisabled: { opacity: 0.6 },
  lockBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  createSheet: {
    width: '100%',
    overflow: 'hidden',
  },
  createSheetContent: {
    // Bottom padding is on the sticky footer (safe area + actions).
    paddingBottom: theme.spacing.md,
  },
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
