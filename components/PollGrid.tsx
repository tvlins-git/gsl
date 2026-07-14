import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';
import {
  type PollResponseValue,
  formatSlotTime,
  responseEmoji,
  responseLabel,
} from '@/lib/polls';

export interface PollGridSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface PollGridResponse {
  slotId: string;
  memberId: string;
  response: PollResponseValue;
}

interface PollGridProps {
  members: Member[];
  slots: PollGridSlot[];
  responses: PollGridResponse[];
  currentMemberId?: string;
  onVote?: (slotId: string, response: PollResponseValue) => void;
  readOnly?: boolean;
}

export function PollGrid({
  members,
  slots,
  responses,
  currentMemberId,
  onVote,
  readOnly = false,
}: PollGridProps) {
  const getResponse = (slotId: string, memberId: string): PollResponseValue | null => {
    return responses.find((r) => r.slotId === slotId && r.memberId === memberId)?.response ?? null;
  };

  return (
    <ScrollView horizontal testID="poll-grid">
      <View>
        <View style={styles.headerRow}>
          <View style={styles.memberHeaderCell} />
          {slots.map((slot) => (
            <View key={slot.id} style={styles.slotHeaderCell}>
              <Text style={styles.slotHeaderText} numberOfLines={2}>
                {formatSlotTime(slot.startsAt, slot.endsAt)}
              </Text>
            </View>
          ))}
        </View>
        {members.map((member) => (
          <View key={member.id} style={styles.dataRow}>
            <View style={styles.memberCell}>
              <Text style={styles.memberName} numberOfLines={1}>
                {member.display_name}
              </Text>
            </View>
            {slots.map((slot) => {
              const current = getResponse(slot.id, member.id);
              const isOwnRow = member.id === currentMemberId;

              return (
                <View key={slot.id} style={styles.responseCell}>
                  {isOwnRow && !readOnly && onVote ? (
                    <View style={styles.voteButtons}>
                      {(['yes', 'maybe', 'no'] as PollResponseValue[]).map((val) => (
                        <Pressable
                          key={val}
                          style={[styles.voteBtn, current === val && styles.voteBtnActive]}
                          onPress={() => onVote(slot.id, val)}
                          testID={`vote-${slot.id}-${val}`}
                        >
                          <Text style={[styles.voteBtnText, current === val && styles.voteBtnTextActive]}>
                            {responseEmoji(val)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.responseText}>
                      {current ? responseEmoji(current) : '—'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          {(['yes', 'maybe', 'no'] as PollResponseValue[]).map((val) => (
            <Text key={val} style={styles.legendItem}>
              {responseEmoji(val)} {responseLabel(val)}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    backgroundColor: theme.colors.bg,
  },
  memberHeaderCell: {
    width: 100,
  },
  slotHeaderCell: {
    width: 120,
    padding: theme.spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  slotHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.text,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  memberCell: {
    width: 100,
    padding: theme.spacing.sm,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  responseCell: {
    width: 120,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.borderLight,
    minHeight: 44,
  },
  responseText: {
    fontSize: 18,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  voteBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  voteBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  voteBtnText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  voteBtnTextActive: {
    color: theme.colors.onPrimary,
  },
  legend: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  legendItem: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
