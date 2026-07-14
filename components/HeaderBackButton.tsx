import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

// Renders the header back control as a SymbolView (a colored font glyph on
// web/Android, SF Symbol on iOS). The default React Navigation back button uses
// a tinted PNG Image, which relies on react-native-web's SVG tint filter and can
// render blank on web when that filter definition is missing.
export function HeaderBackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={styles.button}
    >
      <SymbolView
        name={{ ios: 'chevron.backward', android: 'arrow_back', web: 'arrow_back' }}
        tintColor={theme.colors.primary}
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 4,
    paddingRight: 12,
  },
});
