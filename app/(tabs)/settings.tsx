import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserAvatar } from '@/components/UserAvatar';
import { UserOptionRow } from '@/components/UserOptionRow';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_HARDCODED_USER,
  HARDCODED_USERS,
  getHardcodedUser,
} from '@/constants/hardcoded-user';
import { getStoredUser, updateMemberContactEmail } from '@/lib/auth';
import { isValidContactEmail } from '@/lib/calendar-invite';
import { resetUserPassword } from '@/lib/user-passwords';
import { sharedStyles, theme } from '@/constants/theme';

export default function SettingsScreen() {
  const { member, loggedOut, signOut, signIn, loading, localMode, refreshMember } = useAuth();
  const [busy, setBusy] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_HARDCODED_USER.id);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    if (!loggedOut && member) return;
    getStoredUser().then((user) => setSelectedUserId(user.id));
  }, [loggedOut, member]);

  useEffect(() => {
    setContactEmail(member?.contact_email ?? '');
    setEmailError('');
    setEmailSuccess('');
  }, [member?.id, member?.contact_email]);

  const selectedUser = getHardcodedUser(selectedUserId) ?? DEFAULT_HARDCODED_USER;
  const signedInUser = member
    ? HARDCODED_USERS.find((user) => user.displayName === member.display_name)
    : undefined;

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      setPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetError('');
      setResetSuccess('');
      setContactEmail('');
      setEmailError('');
      setEmailSuccess('');
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async () => {
    if (!password.trim()) {
      setLoginError('Enter your password.');
      return;
    }

    setBusy(true);
    setLoginError('');
    try {
      const result = await signIn(selectedUser, password.trim());
      if (!result.ok) {
        setLoginError(result.error);
        return;
      }
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!signedInUser) return;

    setBusy(true);
    setResetError('');
    setResetSuccess('');
    try {
      const result = await resetUserPassword(
        signedInUser,
        currentPassword.trim(),
        newPassword.trim(),
        confirmPassword.trim()
      );
      if (!result.ok) {
        setResetError(result.error);
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetSuccess('Password updated successfully.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!member) return;

    const trimmed = contactEmail.trim();
    if (trimmed && !isValidContactEmail(trimmed)) {
      setEmailError('Enter a valid email address.');
      setEmailSuccess('');
      return;
    }

    setBusy(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      await updateMemberContactEmail(member.id, trimmed || null);
      await refreshMember();
      setEmailSuccess(trimmed ? 'Email saved for calendar invites.' : 'Email cleared.');
    } catch {
      setEmailError('Could not save email. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Screen loading />;
  }

  const isSignedIn = !loggedOut && !!member;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSignedIn ? (
          <>
            <View style={[styles.profileCard, sharedStyles.card]}>
              <UserAvatar name={member.display_name} size={72} />
              <Text style={styles.profileName}>{member.display_name}</Text>
              <View style={styles.badgeRow}>
                <StatusBadge status="signed in" />
                {localMode && (
                  <View style={styles.localBadge}>
                    <Text style={styles.localBadgeText}>Local mode</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.sectionCard, sharedStyles.card]}>
              <Text style={sharedStyles.sectionTitle}>Email</Text>
              <Text style={styles.sectionHint}>
                Used for calendar invites when a plan date is locked in.
              </Text>
              <Text style={styles.fieldLabel}>Email address</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textMuted}
                value={contactEmail}
                onChangeText={(value) => {
                  setContactEmail(value);
                  setEmailError('');
                  setEmailSuccess('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                testID="contact-email-input"
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              {emailSuccess ? <Text style={styles.successText}>{emailSuccess}</Text> : null}
              <Pressable
                style={[sharedStyles.secondaryBtn, busy && styles.btnDisabled]}
                onPress={handleSaveEmail}
                disabled={busy}
                testID="save-email-btn"
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <Text style={sharedStyles.secondaryBtnText}>Save email</Text>
                )}
              </Pressable>
            </View>

            <View style={[styles.sectionCard, sharedStyles.card]}>
              <Text style={sharedStyles.sectionTitle}>Reset password</Text>
              <Text style={styles.sectionHint}>
                Change your login password for this device.
              </Text>
              <Text style={styles.fieldLabel}>Current password</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Current password"
                placeholderTextColor={theme.colors.textMuted}
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  setResetError('');
                  setResetSuccess('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                testID="current-password-input"
              />
              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="New password"
                placeholderTextColor={theme.colors.textMuted}
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setResetError('');
                  setResetSuccess('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                testID="new-password-input"
              />
              <Text style={styles.fieldLabel}>Confirm new password</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textMuted}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setResetError('');
                  setResetSuccess('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                testID="confirm-password-input"
              />
              {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}
              {resetSuccess ? <Text style={styles.successText}>{resetSuccess}</Text> : null}
              <Pressable
                style={[sharedStyles.secondaryBtn, busy && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={busy}
                testID="reset-password-btn"
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <Text style={sharedStyles.secondaryBtnText}>Update password</Text>
                )}
              </Pressable>
            </View>

            <View style={[styles.sectionCard, sharedStyles.card]}>
              <Text style={sharedStyles.sectionTitle}>Account</Text>
              <Pressable
                style={[styles.logoutBtn, busy && styles.btnDisabled]}
                onPress={handleSignOut}
                disabled={busy}
                testID="logout-btn"
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.danger} />
                ) : (
                  <Text style={styles.logoutText}>Log out</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Logo size={80} showTitle={false} />
              <Text style={styles.heroTitle}>Welcome to GSL</Text>
              <Text style={styles.heroSubtitle}>Choose your account and enter your password</Text>
            </View>

            <View style={[styles.sectionCard, sharedStyles.card]}>
              <Text style={sharedStyles.sectionTitle}>Select user</Text>
              <View style={styles.userList}>
                {HARDCODED_USERS.map((user) => (
                  <UserOptionRow
                    key={user.id}
                    user={user}
                    selected={selectedUserId === user.id}
                    onSelect={() => {
                      setSelectedUserId(user.id);
                      setLoginError('');
                    }}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setLoginError('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSignIn}
                testID="login-password-input"
              />
              {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
              <Pressable
                style={[sharedStyles.primaryBtn, styles.loginBtn, busy && styles.btnDisabled]}
                onPress={handleSignIn}
                disabled={busy}
                testID="sign-in-btn"
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text style={sharedStyles.primaryBtnText}>
                    Continue as {selectedUser.displayName}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  userList: {
    gap: theme.spacing.sm,
  },
  loginBtn: {
    marginTop: theme.spacing.xs,
  },
  profileCard: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  localBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.warningSoft,
  },
  localBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
  },
  successText: {
    color: theme.colors.success,
    fontSize: 14,
  },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  logoutText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
