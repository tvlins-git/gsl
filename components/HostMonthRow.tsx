import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MemberSelect } from '@/components/MemberSelect';
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
      <View style={styles.labelCol}>
        <Text style={styles.monthLabel}>{month.label}</Text>
        {month.isCurrent && <Text style={styles.badgeCurrent}>Current month</Text>}
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
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  currentCard: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  nextCard: {
    borderColor: '#fcd34d',
    backgroundColor: theme.colors.warningSoft,
  },
  labelCol: {
    flex: 1,
    minWidth: 0,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badgeCurrent: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeNext: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
