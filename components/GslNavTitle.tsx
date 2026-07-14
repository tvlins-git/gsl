import { Image, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '@/constants/brand';

interface GslNavTitleProps {
  /** e.g. "Hosts" → renders "GSL · Hosts" */
  suffix?: string;
  /** Full custom title instead of APP_NAME · suffix */
  title?: string;
}

export function GslNavTitle({ suffix, title }: GslNavTitleProps) {
  const label = title ?? (suffix ? `${APP_NAME} · ${suffix}` : APP_NAME);

  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel={`${APP_NAME} logo`}
      />
      <Text style={styles.title} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#1c1c1e',
  },
});
