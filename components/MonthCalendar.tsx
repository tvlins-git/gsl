import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday-first month grid. Empty cells are leading/trailing padding. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const lead = (firstWeekday + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface MonthCalendarProps {
  value: Date;
  onChange: (next: Date) => void;
  minimumDate?: Date;
}

export function MonthCalendar({ value, onChange, minimumDate }: MonthCalendarProps) {
  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const [visible, setVisible] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const year = visible.getFullYear();
  const month = visible.getMonth();
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const title = visible.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const minMonth = minDay ? new Date(minDay.getFullYear(), minDay.getMonth(), 1) : null;
  const canGoPrev = !minMonth || visible.getTime() > minMonth.getTime();

  const shiftMonth = (delta: number) => {
    setVisible((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <View style={styles.card} testID="month-calendar">
      <View style={styles.header}>
        <Pressable
          onPress={() => canGoPrev && shiftMonth(-1)}
          disabled={!canGoPrev}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          testID="calendar-prev"
          style={styles.navBtn}
        >
          <Text style={[styles.navText, !canGoPrev && styles.navTextDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          testID="calendar-next"
          style={styles.navBtn}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day == null) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const date = new Date(year, month, day);
          const disabled = minDay != null && date.getTime() < minDay.getTime();
          const selected = isSameDay(date, value);
          return (
            <Pressable
              key={day}
              style={styles.cell}
              disabled={disabled}
              onPress={() => onChange(date)}
              accessibilityRole="button"
              accessibilityLabel={date.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              accessibilityState={{ selected, disabled }}
              testID={`calendar-day-${day}`}
            >
              <View style={[styles.day, selected && styles.daySelected]}>
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 28,
    lineHeight: 32,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  navTextDisabled: {
    color: theme.colors.border,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 16,
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  dayTextDisabled: {
    color: theme.colors.textMuted,
  },
  dayTextSelected: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
});
