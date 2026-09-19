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
    background: '#14110f',
    tint: tintColorDark,
    tabIconDefault: '#8a827b',
    tabIconSelected: tintColorDark,
  },
};
