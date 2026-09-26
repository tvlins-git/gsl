import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';

export const TIME_WHEEL_ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
export const TIME_WHEEL_HEIGHT = TIME_WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS;
const SIDE_SPACER = TIME_WHEEL_ITEM_HEIGHT * 2;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function indexFromOffset(y: number, length: number) {
  return Math.min(length - 1, Math.max(0, Math.round(y / TIME_WHEEL_ITEM_HEIGHT)));
}

function WheelColumn({
  items,
  value,
  onChange,
  onInteractionChange,
  testID,
  accessibilityLabel,
}: {
  items: readonly number[];
  value: number;
  onChange: (n: number) => void;
  onInteractionChange?: (active: boolean) => void;
  testID: string;
  accessibilityLabel: string;
}) {
  const ref = useRef<ScrollView>(null);
  const dragging = useRef(false);
  const momentumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(value);

  const clearMomentumTimer = () => {
    if (!momentumTimer.current) return;
    clearTimeout(momentumTimer.current);
    momentumTimer.current = null;
  };

  useEffect(() => clearMomentumTimer, []);

  const scrollToValue = useCallback(
    (next: number, animated: boolean) => {
      const index = items.indexOf(next);
      if (index < 0) return;
      ref.current?.scrollTo({ y: index * TIME_WHEEL_ITEM_HEIGHT, animated });
    },
    [items]
  );

  useEffect(() => {
    if (dragging.current) return;
    setActive(value);
    scrollToValue(value, false);
  }, [scrollToValue, value]);

  const finish = (y: number) => {
    if (!dragging.current) return;
    dragging.current = false;
    onInteractionChange?.(false);
    const index = indexFromOffset(y, items.length);
    const next = items[index];
    const target = index * TIME_WHEEL_ITEM_HEIGHT;
    setActive(next);
    if (Math.abs(y - target) > 0.5) scrollToValue(next, false);
    if (next !== value) onChange(next);
  };

  return (
    <ScrollView
      ref={ref}
      testID={testID}
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
      nestedScrollEnabled
      disableIntervalMomentum
      bounces={false}
      scrollEventThrottle={16}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: pad2(value) }}
      onLayout={() => {
        if (dragging.current) return;
        scrollToValue(value, false);
      }}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!dragging.current) return;
        const index = indexFromOffset(e.nativeEvent.contentOffset.y, items.length);
        setActive(items[index]);
      }}
      onScrollBeginDrag={() => {
        clearMomentumTimer();
        dragging.current = true;
        onInteractionChange?.(true);
      }}
      onMomentumScrollEnd={(e) => {
        clearMomentumTimer();
        finish(e.nativeEvent.contentOffset.y);
      }}
      onScrollEndDrag={(e) => {
        const velocity = Math.abs(e.nativeEvent.velocity?.y ?? 0);
        const y = e.nativeEvent.contentOffset.y;
        if (velocity < 0.05) {
          finish(y);
          return;
        }
        clearMomentumTimer();
        momentumTimer.current = setTimeout(() => finish(y), 350);
      }}
      {...(Platform.OS === 'web'
        ? {
            // Keep mouse-wheel / trackpad motion on this column, not the parent sheet.
            onWheel: (e: { stopPropagation?: () => void }) => e.stopPropagation?.(),
          }
        : null)}
    >
      {items.map((item) => (
        <View key={item} style={styles.item}>
          <Text style={[styles.itemText, item === active && styles.itemTextSelected]}>{pad2(item)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

interface TimeWheelPickerProps {
  value: Date;
  onChange: (next: Date) => void;
  onInteractionChange?: (active: boolean) => void;
}

export function TimeWheelPicker({ value, onChange, onInteractionChange }: TimeWheelPickerProps) {
  const setPart = (hours: number, minutes: number) => {
    const next = new Date(value);
    next.setHours(hours, minutes, 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.wrap} testID="time-wheel-picker">
      <View style={styles.selection} pointerEvents="none" />
      <WheelColumn
        items={HOURS}
        value={value.getHours()}
        onChange={(hours) => setPart(hours, value.getMinutes())}
        onInteractionChange={onInteractionChange}
        testID="time-wheel-hours"
        accessibilityLabel="Start hour"
      />
      <Text style={styles.colon} pointerEvents="none">
        :
      </Text>
      <WheelColumn
        items={MINUTES}
        value={value.getMinutes()}
        onChange={(minutes) => setPart(value.getHours(), minutes)}
        onInteractionChange={onInteractionChange}
        testID="time-wheel-minutes"
        accessibilityLabel="Start minute"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: TIME_WHEEL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selection: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: TIME_WHEEL_ITEM_HEIGHT,
    top: SIDE_SPACER,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
  },
  column: {
    height: TIME_WHEEL_HEIGHT,
    flex: 1,
  },
  columnContent: {
    paddingVertical: SIDE_SPACER,
  },
  item: {
    height: TIME_WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 20,
    color: theme.colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  itemTextSelected: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  colon: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    width: 16,
    textAlign: 'center',
  },
});
