import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/constants/theme';

interface PollThreadLinkProps {
  title: string;
  onPress: () => void;
  testID?: string;
  variant?: 'banner' | 'inline';
}

export function PollThreadLink({
  title,
  onPress,
  testID = 'poll-thread-link',
  variant = 'banner',
}: PollThreadLinkProps) {
  if (variant === 'inline') {
    return (
      <Pressable onPress={onPress} testID={testID} accessibilityRole="link">
        <Text style={styles.inline} numberOfLines={1}>
          Poll · {title}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.banner}
      onPress={onPress}
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={`Open poll ${title}`}
    >
      <Text style={styles.kicker}>Poll</Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.open}>Open</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  open: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  inline: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});
