import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppUser } from '@/constants/hardcoded-user';
import { ensureAppUsersLoaded } from '@/lib/app-users';
import {
  activateLocalMode,
  clearLoggedOut,
  ensureHardcodedSession,
  getCurrentMember,
  getStoredUser,
  isLoggedOut,
  setLocalModePersisted,
  setStoredUser,
  signInWithPassword,
  signOutUser,
  wasLocalModePersisted,
} from '@/lib/auth';
import type { Member } from '@/lib/database.types';
import { disableLocalMode, isLocalMode } from '@/lib/local-store';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import { getEffectivePassword, setPasswordOverride } from '@/lib/user-passwords';

interface AuthContextValue {
  session: Session | null;
  member: Member | null;
  loading: boolean;
  localMode: boolean;
  loggedOut: boolean;
  refreshMember: () => Promise<void>;
  /** Apply a freshly saved member row immediately (e.g. notification preference). */
  applyMember: (member: Member) => void;
  signOut: () => Promise<void>;
  signIn: (user: AppUser, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrapSession(
  user: AppUser,
  typedPassword: string,
  setSession: (s: Session | null) => void,
  setMember: (m: Member | null) => void,
  setLocalMode: (v: boolean) => void,
  setLoggedOut: (v: boolean) => void,
  refreshMember: () => Promise<void>
) {
  await ensureAppUsersLoaded();

  const hadLocalPassword = !!(await getEffectivePassword(user));
  const s = await ensureHardcodedSession(user, typedPassword);
  if (s) {
    if (!hadLocalPassword && typedPassword.trim()) {
      await setPasswordOverride(user.id, typedPassword.trim());
    }
    await setLocalModePersisted(false);
    setSession(s);
    setLoggedOut(false);
    await refreshMember();
    return { ok: true as const };
  }

  // Cold-start remote account with a wrong password must not silently enter
  // local mode as that person — Supabase rejected the credential.
  if (!hadLocalPassword) {
    return { ok: false as const, error: 'Incorrect password.' };
  }

  const localMember = await activateLocalMode(user);
  setLocalMode(true);
  setMember(localMember);
  setLoggedOut(false);
  return { ok: true as const };
}

/**
 * Restore a previous session after force-quit / relaunch.
 * Never auto-login Hr. Lins; never wipe a valid session on boot.
 */
async function restoreSessionOnLaunch(
  setSession: (s: Session | null) => void,
  setMember: (m: Member | null) => void,
  setLocalMode: (v: boolean) => void,
  setLoggedOut: (v: boolean) => void,
  refreshMember: () => Promise<void>
): Promise<boolean> {
  await ensureAppUsersLoaded();

  if (await isLoggedOut()) {
    disableLocalMode();
    setSession(null);
    setMember(null);
    setLocalMode(false);
    setLoggedOut(true);
    return false;
  }

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await setLocalModePersisted(false);
    disableLocalMode();
    setSession(data.session);
    setLocalMode(false);
    setLoggedOut(false);
    await refreshMember();
    return true;
  }

  const storedUser = await getStoredUser();
  if (storedUser && (await wasLocalModePersisted())) {
    const localMember = await activateLocalMode(storedUser);
    setSession(null);
    setMember(localMember);
    setLocalMode(true);
    setLoggedOut(false);
    return true;
  }

  // No persisted session — stay on login without calling signOut (storage is already empty).
  disableLocalMode();
  setSession(null);
  setMember(null);
  setLocalMode(false);
  setLoggedOut(true);
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);
  const [loggedOut, setLoggedOut] = useState(true);
  const loggedOutRef = useRef(loggedOut);
  loggedOutRef.current = loggedOut;
  const sessionUnlockedRef = useRef(false);

  const refreshMember = useCallback(async () => {
    const m = await getCurrentMember();
    setMember(m);
    if (m && !isLocalMode()) {
      await registerForPushNotifications(m.user_id).catch(() => undefined);
    }
  }, []);

  const applyMember = useCallback((next: Member) => {
    setMember(next);
  }, []);

  const signOut = useCallback(async () => {
    sessionUnlockedRef.current = false;
    await signOutUser();
    setSession(null);
    setMember(null);
    setLocalMode(false);
    setLoggedOut(true);
  }, []);

  const signIn = useCallback(async (user: AppUser, password: string) => {
    const result = await signInWithPassword(user, password);
    if (!result.ok) return result;

    setLoading(true);
    // Persist the chosen account before clearing logged-out so no race can
    // bootstrap a previous user from storage.
    await setStoredUser(user);
    await clearLoggedOut();
    sessionUnlockedRef.current = true;
    setLoggedOut(false);
    setLocalMode(false);
    try {
      const boot = await bootstrapSession(
        user,
        password,
        setSession,
        setMember,
        setLocalMode,
        setLoggedOut,
        refreshMember
      );
      if (!boot.ok) {
        sessionUnlockedRef.current = false;
        setLoggedOut(true);
        setSession(null);
        setMember(null);
        setLocalMode(false);
        return boot;
      }
      return { ok: true as const };
    } catch {
      await ensureAppUsersLoaded();
      const localMember = await activateLocalMode(user);
      setLocalMode(true);
      setMember(localMember);
      setLoggedOut(false);
      return { ok: true as const };
    } finally {
      setLoading(false);
    }
  }, [refreshMember]);

  useEffect(() => {
    let cancelled = false;

    restoreSessionOnLaunch(setSession, setMember, setLocalMode, setLoggedOut, refreshMember)
      .then((restored) => {
        if (cancelled) return;
        sessionUnlockedRef.current = restored;
      })
      .catch(() => {
        if (cancelled) return;
        sessionUnlockedRef.current = false;
        disableLocalMode();
        setSession(null);
        setMember(null);
        setLocalMode(false);
        setLoggedOut(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!sessionUnlockedRef.current || loggedOutRef.current) return;
      if (!isLocalMode()) {
        setSession(s);
        if (s) refreshMember();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshMember]);

  const value = useMemo(
    () => ({
      session,
      member,
      loading,
      localMode,
      loggedOut,
      refreshMember,
      applyMember,
      signOut,
      signIn,
    }),
    [session, member, loading, localMode, loggedOut, refreshMember, applyMember, signOut, signIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
