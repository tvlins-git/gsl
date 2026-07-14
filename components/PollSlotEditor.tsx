import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { formatSlotTime, buildPollSlotFromDates, type PollSlotTimes } from '@/lib/polls';

export type DraftSlot = PollSlotTimes;

interface PollSlotEditorProps {
  slots: DraftSlot[];
  onSlotsChange: (slots: DraftSlot[]) => void;
  slotError?: string;
  onSlotError?: (message: string) => void;
}

function defaultStartTime() {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  return d;
}

function WebDateInput({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const dateStr = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return (
    // @ts-expect-error — web-only native input
    <input
      type="date"
      value={dateStr}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const [y, m, d] = e.target.value.split('-').map(Number);
        if (!y || !m || !d) return;
        const next = new Date(value);
        next.setFullYear(y, m - 1, d);
        onChange(next);
      }}
      style={webInputStyle}
    />
  );
}

function WebTimeInput({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const timeStr = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return (
    // @ts-expect-error — web-only native input
    <input
      type="time"
      value={timeStr}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const [h, min] = e.target.value.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(min)) return;
        const next = new Date(value);
        next.setHours(h, min, 0, 0);
        onChange(next);
      }}
      style={webInputStyle}
    />
  );
}

const webInputStyle = {
  width: '100%',
  padding: 12,
  fontSize: 16,
  borderRadius: theme.radius.md,
  border: `1px solid ${theme.colors.border}`,
  boxSizing: 'border-box' as const,
  backgroundColor: theme.colors.surface,
};

export function PollSlotEditor({ slots, onSlotsChange, slotError, onSlotError }: PollSlotEditorProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  const addSlot = () => {
    onSlotError?.('');
    const result = buildPollSlotFromDates(selectedDate, startTime);
    if ('error' in result) {
      onSlotError?.(result.error);
      return;
    }
    onSlotsChange([...slots, result]);
  };

  const removeSlot = (index: number) => {
    onSlotsChange(slots.filter((_, i) => i !== index));
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) setStartTime(date);
  };

  const dateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Add time slots</Text>
      <Text style={styles.hint}>Pick a date and start time, then tap &quot;Add slot&quot;. Repeat for more options.</Text>

      <Text style={styles.fieldLabel}>Date</Text>
      {Platform.OS === 'web' ? (
        <WebDateInput value={selectedDate} onChange={setSelectedDate} />
      ) : (
        <>
          {Platform.OS === 'android' && (
            <Pressable style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.pickerBtnText}>{dateLabel}</Text>
            </Pressable>
          )}
          {(showDatePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </>
      )}

      <Text style={styles.fieldLabel}>Start time (2 h slot)</Text>
      {Platform.OS === 'web' ? (
        <WebTimeInput value={startTime} onChange={setStartTime} />
      ) : (
        <>
          {Platform.OS === 'android' && (
            <Pressable style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.pickerBtnText}>{timeLabel}</Text>
            </Pressable>
          )}
          {(showTimePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              onChange={onTimeChange}
            />
          )}
        </>
      )}

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
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickerBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    backgroundColor: theme.colors.bg,
  },
  pickerBtnText: { fontSize: 16, color: theme.colors.text },
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
