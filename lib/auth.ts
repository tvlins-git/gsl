import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_HARDCODED_USER,
  getHardcodedUser,
  type HardcodedUser,
} from '@/constants/hardcoded-user';
import {
  createLocalMember,
  disableLocalMode,
  enableLocalMode,
  getLocalGroupMembers,
  isLocalMode,
  localStore,
  setActiveLocalUser,
} from './local-store';
import { supabase } from './supabase';
import { getEffectivePassword, validateUserPassword } from './user-passwords';
import type { Member } from './database.types';

const LOGGED_OUT_KEY = 'gsl_logged_out';
const SELECTED_USER_KEY = 'gsl_selected_user_id';

export async function isLoggedOut(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOGGED_OUT_KEY)) === 'true';
}

export async function clearLoggedOut() {
  await AsyncStorage.removeItem(LOGGED_OUT_KEY);
}

export async function getStoredUser(): Promise<HardcodedUser> {
  const id = await AsyncStorage.getItem(SELECTED_USER_KEY);
  return getHardcodedUser(id ?? '') ?? DEFAULT_HARDCODED_USER;
}

export async function setStoredUser(user: HardcodedUser) {
  await AsyncStorage.setItem(SELECTED_USER_KEY, user.id);
}

export async function signOutUser() {
  disableLocalMode();
  await supabase.auth.signOut();
  await AsyncStorage.setItem(LOGGED_OUT_KEY, 'true');
}

/** Sign in with a hardcoded user; returns session or null (caller enables local mode). */
export async function ensureHardcodedSession(user: HardcodedUser) {
  const { email, displayName } = user;
  const password = await getEffectivePassword(user);
  await setStoredUser(user);

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.email === email) {
      await ensureMemberRecord(displayName);
      return existing.session;
    }
    await supabase.auth.signOut();
  }

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error && signIn.data.session) {
    await ensureMemberRecord(displayName);
    return signIn.data.session;
  }

  if (signIn.error?.message?.includes('rate limit')) return null;

  const signUp = await supabase.auth.signUp({ email, password });
  if (signUp.error?.message?.includes('rate limit')) return null;

  if (signUp.error?.message?.toLowerCase().includes('already registered')) {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.data.session) {
      await ensureMemberRecord(displayName);
      return retry.data.session;
    }
    return null;
  }

  if (signUp.error) return null;

  if (signUp.data.session) {
    await bootstrapIfNeeded(displayName);
    return signUp.data.session;
  }

  const retry = await supabase.auth.signInWithPassword({ email, password });
  if (retry.data.session) {
    await ensureMemberRecord(displayName);
    return retry.data.session;
  }

  return null;
}

async function bootstrapIfNeeded(displayName: string) {
  const bootstrapped = await isGroupBootstrapped();
  if (!bootstrapped) {
    await supabase.rpc('bootstrap_admin_group', { p_display_name: displayName });
  }
  await ensureMemberRecord(displayName);
}

async function ensureMemberRecord(displayName: string) {
  const member = await getCurrentMemberFromDb();
  if (member) {
    if (member.display_name !== displayName) {
      await supabase.from('members').update({ display_name: displayName }).eq('id', member.id);
    }
    return;
  }

  const bootstrapped = await isGroupBootstrapped();
  if (!bootstrapped) {
    await supabase.rpc('bootstrap_admin_group', { p_display_name: displayName });
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data: group } = await supabase.from('groups').select('id').limit(1).single();
  if (user && group) {
    await supabase.from('members').upsert(
      {
        group_id: group.id,
        user_id: user.id,
        display_name: displayName,
        role: 'admin',
      },
      { onConflict: 'group_id,user_id' }
    );
  }
}

async function isGroupBootstrapped(): Promise<boolean> {
  const { count, error } = await supabase.from('groups').select('*', { count: 'exact', head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}

async function getCurrentMemberFromDb(): Promise<Member | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('members').select('*').eq('user_id', user.id).single();
  if (error) return null;
  return data;
}

export async function getCurrentMember(): Promise<Member | null> {
  if (isLocalMode()) {
    await localStore.hydrate();
    return createLocalMember();
  }
  return getCurrentMemberFromDb();
}

export async function getGroupMembers(groupId: string): Promise<Member[]> {
  if (isLocalMode()) {
    await localStore.hydrate();
    return getLocalGroupMembers();
  }
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId)
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}

export async function updateMemberProfile(memberId: string, displayName: string, avatarUrl?: string) {
  if (isLocalMode()) {
    await localStore.hydrate();
    return createLocalMember();
  }
  const { data, error } = await supabase
    .from('members')
    .update({ display_name: displayName, avatar_url: avatarUrl ?? null })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMemberContactEmail(memberId: string, email: string | null) {
  const trimmed = email?.trim() || null;
  if (isLocalMode()) {
    return localStore.updateMemberEmail(memberId, trimmed);
  }
  const { data, error } = await supabase
    .from('members')
    .update({ contact_email: trimmed })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function activateLocalMode(user: HardcodedUser) {
  enableLocalMode();
  setActiveLocalUser(user);
  void localStore.hydrate();
  return createLocalMember();
}

export async function signInWithPassword(
  user: HardcodedUser,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await validateUserPassword(user, password))) {
    return { ok: false, error: 'Incorrect password.' };
  }
  return { ok: true };
}
