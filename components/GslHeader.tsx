import { StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '@/constants/brand';
import { Logo } from './Logo';

interface GslHeaderProps {
  subtitle?: string;
  compact?: boolean;
}

export function GslHeader({ subtitle, compact = false }: GslHeaderProps) {
  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Logo size={32} showTitle={false} />
        <Text style={styles.compactTitle}>{APP_NAME}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Logo size={64} showTitle />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  compactTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
