import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';
import { sharedStyles, theme } from '@/constants/theme';

interface ScreenProps extends ViewProps {
  loading?: boolean;
  padded?: boolean;
}

export function Screen({ loading, padded, style, children, ...rest }: ScreenProps) {
  if (loading) {
    return (
      <View style={[sharedStyles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[sharedStyles.screen, padded && sharedStyles.screenContent, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
