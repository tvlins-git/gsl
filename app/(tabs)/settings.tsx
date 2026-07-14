import { useCallback, useEffect, useState } from 'react';
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
  ADMIN_USER_ID,
  DEFAULT_HARDCODED_USER,
  isAdminUser,
  type AppUser,
} from '@/constants/hardcoded-user';
import {
  createAppUser,
  deleteAppUser,
  listAppUsers,
  resolveSignedInAppUser,
} from '@/lib/app-users';
import { getStoredUser } from '@/lib/auth';
import { clearPasswordOverride, resetUserPassword } from '@/lib/user-passwords';
import { sharedStyles, theme } from '@/constants/theme';

export default function SettingsScreen() {
  const { member, loggedOut, signOut, signIn, loading, localMode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_HARDCODED_USER.id);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userMgmtError, setUserMgmtError] = useState('');
  const [userMgmtSuccess, setUserMgmtSuccess] = useState('');

  const refreshUsers = useCallback(async () => {
    const list = await listAppUsers();
    setUsers(list);
    return list;
  }, []);

  useEffect(() => {
    refreshUsers().catch(() => undefined);
  }, [refreshUsers, member, loggedOut]);

  useEffect(() => {
    if (!loggedOut && member) return;
    getStoredUser().then((user) => setSelectedUserId(user.id));
  }, [loggedOut, member]);

  const selectedUser =
    users.find((user) => user.id === selectedUserId) ??
    users[0] ??
    DEFAULT_HARDCODED_USER;
  const signedInUser = resolveSignedInAppUser(member?.display_name);
  const isAdmin = isAdminUser(member) || isAdminUser(signedInUser);

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
      setUserMgmtError('');
      setUserMgmtSuccess('');
      setNewUserName('');
      setNewUserPassword('');
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

  const handleCreateUser = async () => {
    if (!signedInUser || !isAdmin) return;

    setBusy(true);
    setUserMgmtError('');
    setUserMgmtSuccess('');
    try {
      const result = await createAppUser({
        displayName: newUserName,
        password: newUserPassword,
      });
      if (!result.ok) {
        setUserMgmtError(result.error);
        return;
      }
      setNewUserName('');
      setNewUserPassword('');
      setUserMgmtSuccess(`Created ${result.user.displayName}.`);
      await refreshUsers();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!signedInUser || !isAdmin) return;

    setBusy(true);
    setUserMgmtError('');
    setUserMgmtSuccess('');
    try {
      const result = await deleteAppUser(user.id, signedInUser.id);
      if (!result.ok) {
        setUserMgmtError(result.error);
        return;
      }
      await clearPasswordOverride(user.id);
      setUserMgmtSuccess(`Deleted ${user.displayName}.`);
      await refreshUsers();
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
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
                {localMode && (
                  <View style={styles.localBadge}>
                    <Text style={styles.localBadgeText}>Local mode</Text>
                  </View>
                )}
              </View>
            </View>

            {isAdmin ? (
              <View style={[styles.sectionCard, sharedStyles.card]} testID="admin-users-section">
                <Text style={sharedStyles.sectionTitle}>Users</Text>
                <Text style={styles.sectionHint}>
                  Create and delete login accounts. Only Hr. Lins is the default admin and cannot be
                  deleted.
                </Text>

                <View style={styles.userMgmtList}>
                  {users.map((user) => {
                    const canDelete =
                      user.id !== ADMIN_USER_ID &&
                      user.id !== signedInUser?.id &&
                      user.role !== 'admin';
                    return (
                      <View key={user.id} style={styles.userMgmtRow} testID={`managed-user-${user.id}`}>
                        <UserAvatar name={user.displayName} size={40} />
                        <View style={styles.userMgmtText}>
                          <Text style={styles.userMgmtName}>{user.displayName}</Text>
                          <Text style={styles.userMgmtMeta}>
                            {user.role === 'admin' ? 'Admin' : 'Member'}
                          </Text>
                        </View>
                        {canDelete ? (
                          <Pressable
                            style={styles.deleteUserBtn}
                            onPress={() => handleDeleteUser(user)}
                            disabled={busy}
                            testID={`delete-user-${user.id}`}
                          >
                            <Text style={styles.deleteUserText}>Delete</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.userMgmtLocked}>Protected</Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>New user name</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="Display name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newUserName}
                  onChangeText={(value) => {
                    setNewUserName(value);
                    setUserMgmtError('');
                    setUserMgmtSuccess('');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  testID="new-user-name-input"
                />
                <Text style={styles.fieldLabel}>Temporary password</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newUserPassword}
                  onChangeText={(value) => {
                    setNewUserPassword(value);
                    setUserMgmtError('');
                    setUserMgmtSuccess('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="new-user-password-input"
                />
                {userMgmtError ? <Text style={styles.errorText}>{userMgmtError}</Text> : null}
                {userMgmtSuccess ? <Text style={styles.successText}>{userMgmtSuccess}</Text> : null}
                <Pressable
                  style={[sharedStyles.primaryBtn, busy && styles.btnDisabled]}
                  onPress={handleCreateUser}
                  disabled={busy}
                  testID="create-user-btn"
                >
                  {busy ? (
                    <ActivityIndicator color={theme.colors.onPrimary} />
                  ) : (
                    <Text style={sharedStyles.primaryBtnText}>Create user</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

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
                {users.map((user) => (
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
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  userMgmtList: {
    gap: theme.spacing.sm,
  },
  userMgmtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  userMgmtText: {
    flex: 1,
    gap: 2,
  },
  userMgmtName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  userMgmtMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  userMgmtLocked: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  deleteUserBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  deleteUserText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
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
