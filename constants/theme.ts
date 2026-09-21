import { Platform, StyleSheet } from 'react-native';

export const theme = {
  colors: {
    // Logo-aligned monochrome: black mark on near-white.
    bg: '#f5f5f5',
    surface: '#ffffff',
    text: '#111111',
    textSecondary: '#525252',
    textMuted: '#8a8a8a',
    border: '#e5e5e5',
    borderLight: '#f0f0f0',
    primary: '#111111',
    primaryPressed: '#000000',
    onPrimary: '#ffffff',
    accent: '#111111',
    accentSoft: '#ececec',
    danger: '#c53030',
    dangerSoft: '#f5e8e8',
    success: '#111111',
    successSoft: '#ececec',
    warningSoft: '#e8e8e8',
    infoSoft: '#f0f0f0',
    storyRing: '#111111',
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  android: { elevation: 3 },
  default: {
    boxShadow: '0 8px 28px rgba(0,0,0,0.08)',
  },
});

export const feedColumn = {
  width: '100%' as const,
  maxWidth: 560,
  alignSelf: 'center' as const,
};

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  screenContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...shadow,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  toolBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  toolBarAction: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBarActionText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    padding: theme.spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
