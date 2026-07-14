import { theme } from './theme';

const tintColorLight = theme.colors.primary;
const tintColorDark = '#fff';

export default {
  light: {
    text: theme.colors.text,
    background: theme.colors.bg,
    tint: tintColorLight,
    tabIconDefault: theme.colors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
