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
import {
  getStoredUser,
  memberNotificationPreference,
  updateMemberContactEmail,
  updateMemberNotificationPreference,
} from '@/lib/auth';
import { clearMemberAvatar, uploadMemberAvatar } from '@/lib/avatar-upload';
import { isValidContactEmail } from '@/lib/calendar-invite';
import {
  deleteLoginAccountFromGroup,
  syncLoginAccountsIntoGroup,
} from '@/lib/group-member-sync';
import {
  NOTIFICATION_PREFERENCE_OPTIONS,
  type NotificationPreference,
} from '@/lib/notification-prefs';
import { isCameraPickerAvailable, pickImageUri, type ImagePickSource } from '@/lib/pick-image';
import { clearPasswordOverride, resetUserPassword } from '@/lib/user-passwords';
import { formatUserFacingError } from '@/lib/user-error';
import { APP_VERSION } from '@/constants/brand';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function SettingsScreen() {
  const { member, loggedOut, signOut, signIn, loading, localMode, refreshMember } = useAuth();
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
  const [contactEmail, setContactEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [notifyPref, setNotifyPref] = useState<NotificationPreference>('all');
  const [notifyError, setNotifyError] = useState('');
  const [notifySuccess, setNotifySuccess] = useState('');

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

  useEffect(() => {
    setContactEmail(member?.contact_email ?? '');
    setEmailError('');
    setEmailSuccess('');
  }, [member?.id, member?.contact_email]);

  useEffect(() => {
    setNotifyPref(memberNotificationPreference(member));
    setNotifyError('');
    setNotifySuccess('');
    setAvatarError('');
    setAvatarSuccess('');
  }, [member?.id, member?.notification_preference, member?.avatar_url]);

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
      setContactEmail('');
      setEmailError('');
      setEmailSuccess('');
      setAvatarError('');
      setAvatarSuccess('');
      setNotifyError('');
      setNotifySuccess('');
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
      if (member && !localMode) {
        const failures = await syncLoginAccountsIntoGroup(member.group_id);
        const failed = failures.find((line) => line.startsWith(`${result.user.displayName}:`));
        if (failed) {
          setUserMgmtError(`Created the login, but they could not be added for tagging. ${failed}`);
          await refreshUsers();
          return;
        }
      }
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
      if (!localMode) {
        const remote = await deleteLoginAccountFromGroup({
          email: user.email,
          displayName: user.displayName,
        });
        if (!remote.ok) {
          setUserMgmtError(remote.error);
          return;
        }
      }
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

  const handlePickAvatar = async (source: ImagePickSource) => {
    if (!member) return;
    setAvatarError('');
    setAvatarSuccess('');
    const uri = await pickImageUri(source);
    if (!uri) return;

    setBusy(true);
    try {
      await uploadMemberAvatar({
        groupId: member.group_id,
        userId: member.user_id,
        memberId: member.id,
        imageUri: uri,
      });
      await refreshMember();
      setAvatarSuccess('Profile picture updated.');
    } catch (err) {
      setAvatarError(formatUserFacingError(err, 'Could not upload photo. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleClearAvatar = async () => {
    if (!member?.avatar_url) return;
    setBusy(true);
    setAvatarError('');
    setAvatarSuccess('');
    try {
      await clearMemberAvatar({
        groupId: member.group_id,
        userId: member.user_id,
        memberId: member.id,
      });
      await refreshMember();
      setAvatarSuccess('Profile picture cleared.');
    } catch (err) {
      setAvatarError(formatUserFacingError(err, 'Could not clear photo. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNotifyPref = async () => {
    if (!member) return;
    setBusy(true);
    setNotifyError('');
    setNotifySuccess('');
    try {
      await updateMemberNotificationPreference(member.id, notifyPref);
      await refreshMember();
      setNotifySuccess('Notification preference saved.');
    } catch (err) {
      setNotifyError(formatUserFacingError(err, 'Could not save preference. Try again.'));
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
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {isSignedIn ? (
          <>
            <View style={[styles.profileCard, sharedStyles.card]}>
              <UserAvatar
                name={member.display_name}
                size={72}
                imageUri={member.avatar_url}
              />
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
              <View style={styles.avatarActions}>
                {isCameraPickerAvailable() ? (
                  <Pressable
                    style={styles.avatarChip}
                    onPress={() => handlePickAvatar('camera')}
                    disabled={busy}
                    testID="avatar-camera-btn"
                  >
                    <Text style={styles.avatarChipText}>Camera</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.avatarChip}
                  onPress={() => handlePickAvatar('gallery')}
                  disabled={busy}
                  testID="avatar-gallery-btn"
                >
                  <Text style={styles.avatarChipText}>Gallery</Text>
                </Pressable>
                {member.avatar_url ? (
                  <Pressable
                    style={styles.avatarChip}
                    onPress={handleClearAvatar}
                    disabled={busy}
                    testID="avatar-clear-btn"
                  >
                    <Text style={styles.avatarChipText}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              {avatarError ? <Text style={styles.errorText}>{avatarError}</Text> : null}
              {avatarSuccess ? <Text style={styles.successText}>{avatarSuccess}</Text> : null}
              <Text style={styles.versionText} testID="app-version">
                Version {APP_VERSION}
              </Text>
            </View>

            <View style={[styles.sectionCard, sharedStyles.card]}>
              <Text style={sharedStyles.sectionTitle}>Notifications</Text>
              <Text style={styles.sectionHint}>
                Choose when GSL can send you a push. Your preference is stored on your member profile.
              </Text>
              {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => {
                const selected = notifyPref === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.notifyOption, selected && styles.notifyOptionSelected]}
                    onPress={() => {
                      setNotifyPref(option.value);
                      setNotifyError('');
                      setNotifySuccess('');
                    }}
                    disabled={busy}
                    testID={`notify-pref-${option.value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={[styles.notifyRadio, selected && styles.notifyRadioSelected]} />
                    <View style={styles.notifyTextWrap}>
                      <Text style={styles.notifyLabel}>{option.label}</Text>
                      <Text style={styles.notifyHint}>{option.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {notifyError ? <Text style={styles.errorText}>{notifyError}</Text> : null}
              {notifySuccess ? <Text style={styles.successText}>{notifySuccess}</Text> : null}
              <Pressable
                style={[sharedStyles.secondaryBtn, busy && styles.btnDisabled]}
                onPress={handleSaveNotifyPref}
                disabled={busy}
                testID="save-notify-pref-btn"
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <Text style={sharedStyles.secondaryBtnText}>Save notifications</Text>
                )}
              </Pressable>
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

            <Text style={styles.versionText} testID="app-version-footer">
              Version {APP_VERSION}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Logo size={80} showTitle={false} />
              <Text style={styles.heroTitle}>Welcome to GSL</Text>
              <Text style={styles.heroSubtitle}>Choose your account and enter your password</Text>
              <Text style={styles.versionText} testID="app-version-login">
                Version {APP_VERSION}
              </Text>
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
    ...feedColumn,
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
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  localBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.warningSoft,
  },
  localBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  avatarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  avatarChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  avatarChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  notifyOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  notifyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accentSoft,
  },
  notifyRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  notifyRadioSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  notifyTextWrap: {
    flex: 1,
    gap: 2,
  },
  notifyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  notifyHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
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
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
