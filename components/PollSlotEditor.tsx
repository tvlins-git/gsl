import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MonthCalendar, startOfDay } from '@/components/MonthCalendar';
import { TimeWheelPicker } from '@/components/TimeWheelPicker';
import { theme } from '@/constants/theme';
import { formatSlotTime, buildPollSlotFromDates, type PollSlotTimes } from '@/lib/polls';

export type DraftSlot = PollSlotTimes;

interface PollSlotEditorProps {
  slots: DraftSlot[];
  onSlotsChange: (slots: DraftSlot[]) => void;
  slotError?: string;
  onSlotError?: (message: string) => void;
  onPickerInteractionChange?: (active: boolean) => void;
}

function defaultStartTime() {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  return d;
}

export function PollSlotEditor({
  slots,
  onSlotsChange,
  slotError,
  onSlotError,
  onPickerInteractionChange,
}: PollSlotEditorProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Month grid is tall; collapse after adding a slot so Create stays reachable.
  const [dateExpanded, setDateExpanded] = useState(true);

  const addSlot = () => {
    onSlotError?.('');
    const result = buildPollSlotFromDates(selectedDate, startTime);
    if ('error' in result) {
      onSlotError?.(result.error);
      return;
    }
    onSlotsChange([...slots, result]);
    setDateExpanded(false);
  };

  const removeSlot = (index: number) => {
    onSlotsChange(slots.filter((_, i) => i !== index));
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const dateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const useMonthGrid = Platform.OS !== 'android';

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Add time slots</Text>
      <Text style={styles.hint}>Pick a date and start time, then tap &quot;Add slot&quot;. Repeat for more options.</Text>

      <Text style={styles.fieldLabel}>Date</Text>
      {useMonthGrid ? (
        dateExpanded ? (
          <MonthCalendar
            value={selectedDate}
            onChange={(next) => {
              setSelectedDate(next);
              setDateExpanded(false);
            }}
            minimumDate={startOfDay(new Date())}
          />
        ) : (
          <Pressable
            style={styles.pickerBtn}
            onPress={() => setDateExpanded(true)}
            accessibilityRole="button"
            accessibilityLabel={`Selected date ${dateLabel}. Change date.`}
            testID="expand-poll-date"
          >
            <Text style={styles.pickerBtnText}>{dateLabel}</Text>
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        )
      ) : (
        <>
          <Pressable style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerBtnText}>{dateLabel}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onDateChange}
              minimumDate={startOfDay(new Date())}
            />
          )}
        </>
      )}

      <Text style={styles.fieldLabel}>Start time (2 h slot)</Text>
      <TimeWheelPicker
        value={startTime}
        onChange={setStartTime}
        onInteractionChange={onPickerInteractionChange}
      />

      {slotError ? <Text style={styles.error}>{slotError}</Text> : null}

      <Pressable style={styles.addBtn} onPress={addSlot} testID="add-poll-slot">
        <Text style={styles.addBtnText}>+ Add slot</Text>
      </Pressable>

      {slots.length > 0 && (
        <View style={styles.slotList}>
          <Text style={styles.fieldLabel}>{slots.length} slot{slots.length === 1 ? '' : 's'} added</Text>
          {slots.map((s, i) => (
            <View key={`${s.startsAt}-${i}`} style={styles.slotRow}>
              <Text style={styles.slotText}>{formatSlotTime(s.startsAt, s.endsAt)}</Text>
              <Pressable onPress={() => removeSlot(i)} hitSlop={8} testID={`remove-slot-${i}`}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  hint: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4, lineHeight: 18 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  pickerBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    backgroundColor: theme.colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  pickerBtnText: { fontSize: 16, color: theme.colors.text, flex: 1 },
  changeText: { fontSize: 14, fontWeight: '600', color: theme.colors.accent },
  addBtn: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addBtnText: { fontWeight: '600', fontSize: 15, color: theme.colors.text },
  error: { color: theme.colors.danger, fontSize: 13 },
  slotList: { marginTop: theme.spacing.sm, gap: 6 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  slotText: { fontSize: 14, flex: 1, color: theme.colors.text },
  removeText: { color: theme.colors.danger, fontSize: 13, fontWeight: '600' },
});
