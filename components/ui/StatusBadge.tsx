import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface StatusBadgeProps {
  status: 'open' | 'closed' | 'signed in' | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const isOpen = normalized === 'open';
  const isSignedIn = normalized === 'signed in';
  return (
    <View
      style={[
        styles.badge,
        isOpen && styles.open,
        isSignedIn && styles.signedIn,
        !isOpen && !isSignedIn && styles.closed,
      ]}
    >
      <Text
        style={[
          styles.text,
          isOpen && styles.openText,
          isSignedIn && styles.signedInText,
          !isOpen && !isSignedIn && styles.closedText,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  open: {
    backgroundColor: theme.colors.successSoft,
  },
  signedIn: {
    backgroundColor: theme.colors.successSoft,
  },
  closed: {
    backgroundColor: theme.colors.borderLight,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  openText: {
    color: theme.colors.success,
  },
  signedInText: {
    color: theme.colors.success,
  },
  closedText: {
    color: theme.colors.textMuted,
  },
});
