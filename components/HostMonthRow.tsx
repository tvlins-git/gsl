import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MemberSelect } from '@/components/MemberSelect';
import { UserAvatar } from '@/components/UserAvatar';
import { sharedStyles, theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';
import type { MonthEntry } from '@/lib/hosts';

interface HostMonthRowProps {
  month: MonthEntry;
  members: Member[];
  assignedMemberId: string | null;
  onAssign: (memberId: string | null) => void;
  onDelete?: () => void;
  disabled?: boolean;
}

const ICON_SLOT = 28;
/** Compact host selector — wide enough for names, not full-row stretch. */
const PICKER_WIDTH = 168;

export function HostMonthRow({
  month,
  members,
  assignedMemberId,
  onAssign,
  onDelete,
  disabled = false,
}: HostMonthRowProps) {
  const canClear = !!assignedMemberId;
  const assigned = members.find((member) => member.id === assignedMemberId);

  return (
    <View
      style={[
        styles.card,
        sharedStyles.card,
        month.isCurrent && styles.currentCard,
        month.isNext && !month.isCurrent && styles.nextCard,
      ]}
      testID={`host-row-${month.year}-${month.month}`}
    >
      {assigned ? (
        <UserAvatar name={assigned.display_name} size={52} imageUri={assigned.avatar_url} ring={month.isCurrent} />
      ) : (
        <View style={styles.emptyAvatar} />
      )}
      <View style={styles.labelCol}>
        <Text style={styles.monthLabel}>{month.label}</Text>
        <Text style={styles.hostName} numberOfLines={1}>
          {assigned?.display_name ?? 'No host yet'}
        </Text>
        {month.isCurrent && <Text style={styles.badgeCurrent}>This month</Text>}
        {month.isNext && !month.isCurrent && <Text style={styles.badgeNext}>Up next</Text>}
      </View>

      <View style={styles.controls}>
        <MemberSelect
          members={members}
          value={assignedMemberId}
          onChange={onAssign}
          disabled={disabled}
          width={PICKER_WIDTH}
          testID={`host-picker-${month.year}-${month.month}`}
        />

        {/* Fixed action column so the clear (X) never shifts adjacent controls. */}
        <View style={[styles.actionsCol, !onDelete && styles.actionsColClearOnly]}>
          <View style={styles.iconSlot}>
            {canClear ? (
              <Pressable
                onPress={() => onAssign(null)}
                disabled={disabled}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove host for ${month.label}`}
                style={styles.iconBtn}
                testID={`host-remove-${month.year}-${month.month}`}
              >
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  tintColor={theme.colors.textMuted}
                  size={16}
                />
              </Pressable>
            ) : null}
          </View>
          {onDelete ? (
            <View style={styles.iconSlot}>
              <Pressable
                onPress={onDelete}
                disabled={disabled}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${month.label} row`}
                style={styles.iconBtn}
                testID={`host-delete-${month.year}-${month.month}`}
              >
                <SymbolView
                  name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                  tintColor={theme.colors.danger}
                  size={18}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  currentCard: {
    backgroundColor: theme.colors.accentSoft,
  },
  nextCard: {
    backgroundColor: theme.colors.warningSoft,
  },
  emptyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.borderLight,
  },
  labelCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hostName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  badgeCurrent: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeNext: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '700',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    width: ICON_SLOT * 2 + theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  actionsColClearOnly: {
    width: ICON_SLOT,
  },
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
