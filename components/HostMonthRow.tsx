import { Picker } from '@react-native-picker/picker';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
const LABEL_WIDTH = 112;

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

      <View style={styles.pickerCol}>
        <Picker
          selectedValue={assignedMemberId ?? ''}
          onValueChange={(value) => onAssign(value || null)}
          enabled={!disabled}
          style={styles.picker}
          testID={`host-picker-${month.year}-${month.month}`}
        >
          <Picker.Item label="Unassigned" value="" />
          {members.map((m) => (
            <Picker.Item key={m.id} label={m.display_name} value={m.id} />
          ))}
        </Picker>
      </View>

      {/* Fixed action column: clear + delete always occupy the same width. */}
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
    width: LABEL_WIDTH,
    flexShrink: 0,
    marginRight: theme.spacing.sm,
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
  pickerCol: {
    flex: 1,
    minWidth: 0,
  },
  picker: {
    height: 44,
    width: '100%',
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
