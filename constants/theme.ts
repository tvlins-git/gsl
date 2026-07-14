import { Platform, StyleSheet } from 'react-native';

export const theme = {
  colors: {
    bg: '#f2f2f7',
    surface: '#ffffff',
    text: '#1c1c1e',
    textSecondary: '#636366',
    textMuted: '#8e8e93',
    border: '#e5e5ea',
    borderLight: '#f0f0f5',
    primary: '#1c1c1e',
    primaryPressed: '#3a3a3c',
    onPrimary: '#ffffff',
    accent: '#2563eb',
    accentSoft: '#eef4ff',
    danger: '#dc2626',
    dangerSoft: '#fef2f2',
    success: '#15803d',
    successSoft: '#ecfdf3',
    warningSoft: '#fff7ed',
    infoSoft: '#eff6ff',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
});

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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...shadow,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
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
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
