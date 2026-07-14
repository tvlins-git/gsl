import { Image, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '@/constants/brand';

interface LogoProps {
  size?: number;
  showTitle?: boolean;
}

export function Logo({ size = 120, showTitle = true }: LogoProps) {
  return (
    <View style={[styles.container, !showTitle && styles.inline]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={`${APP_NAME} logo`}
      />
      {showTitle && <Text style={styles.title}>{APP_NAME}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  inline: {
    gap: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#111',
  },
});
