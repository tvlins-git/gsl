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
  const [active, setActive] = useState(value);

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

  const commitOffset = (y: number) => {
    const index = indexFromOffset(y, items.length);
    const next = items[index];
    setActive(next);
    if (next !== value) onChange(next);
    ref.current?.scrollTo({ y: index * TIME_WHEEL_ITEM_HEIGHT, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = indexFromOffset(e.nativeEvent.contentOffset.y, items.length);
    const next = items[index];
    setActive(next);
    if (next !== value) onChange(next);
  };

  const endInteraction = (y: number) => {
    commitOffset(y);
    if (!dragging.current) return;
    dragging.current = false;
    onInteractionChange?.(false);
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
      scrollEventThrottle={16}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: pad2(value) }}
      onLayout={() => scrollToValue(value, false)}
      onScroll={onScroll}
      onScrollBeginDrag={() => {
        dragging.current = true;
        onInteractionChange?.(true);
      }}
      onMomentumScrollEnd={(e) => endInteraction(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => {
        const velocity = e.nativeEvent.velocity?.y ?? 0;
        if (Math.abs(velocity) < 0.05) {
          endInteraction(e.nativeEvent.contentOffset.y);
        }
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
  const holdCount = useRef(0);

  const beginInteraction = () => {
    holdCount.current += 1;
    onInteractionChange?.(true);
  };

  const endInteraction = () => {
    holdCount.current = Math.max(0, holdCount.current - 1);
    if (holdCount.current === 0) onInteractionChange?.(false);
  };

  const setPart = (hours: number, minutes: number) => {
    const next = new Date(value);
    next.setHours(hours, minutes, 0, 0);
    onChange(next);
  };

  return (
    <View
      style={styles.wrap}
      testID="time-wheel-picker"
      onTouchStart={beginInteraction}
      onTouchEnd={endInteraction}
      onTouchCancel={endInteraction}
    >
      <View style={styles.selection} pointerEvents="none" />
      <WheelColumn
        items={HOURS}
        value={value.getHours()}
        onChange={(hours) => setPart(hours, value.getMinutes())}
        onInteractionChange={(active) => (active ? beginInteraction() : endInteraction())}
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
        onInteractionChange={(active) => (active ? beginInteraction() : endInteraction())}
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
