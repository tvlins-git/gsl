import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';
import { sharedStyles, theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';
import type { MonthEntry } from '@/lib/hosts';

interface HostMonthRowProps {
  month: MonthEntry;
  members: Member[];
  assignedMemberId: string | null;
  onAssign: (memberId: string | null) => void;
  disabled?: boolean;
}

export function HostMonthRow({
  month,
  members,
  assignedMemberId,
  onAssign,
  disabled = false,
}: HostMonthRowProps) {
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
    flex: 1,
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
    flex: 1.2,
  },
  picker: {
    height: 44,
  },
});
