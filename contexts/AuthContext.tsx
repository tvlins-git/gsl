import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  signInWithPassword,
  signOutUser,
} from '@/lib/auth';
import type { Member } from '@/lib/database.types';
import { isLocalMode } from '@/lib/local-store';
import { registerForPushNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  member: Member | null;
  loading: boolean;
  localMode: boolean;
  loggedOut: boolean;
  refreshMember: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (user: AppUser, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrapSession(
  user: AppUser,
  setSession: (s: Session | null) => void,
  setMember: (m: Member | null) => void,
  setLocalMode: (v: boolean) => void,
  setLoggedOut: (v: boolean) => void,
  refreshMember: () => Promise<void>
) {
  await ensureAppUsersLoaded();

  if (await isLoggedOut()) {
    setLoggedOut(true);
    return;
  }

  const s = await ensureHardcodedSession(user);
  if (s) {
    setSession(s);
    setLoggedOut(false);
    await refreshMember();
    return;
  }

  const localMember = activateLocalMode(user);
  setLocalMode(true);
  setMember(localMember);
  setLoggedOut(false);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const refreshMember = useCallback(async () => {
    const m = await getCurrentMember();
    setMember(m);
    if (m && !isLocalMode()) {
      await registerForPushNotifications(m.user_id).catch(() => undefined);
    }
  }, []);

  const signOut = useCallback(async () => {
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
    await clearLoggedOut();
    setLoggedOut(false);
    setLocalMode(false);
    try {
      await bootstrapSession(user, setSession, setMember, setLocalMode, setLoggedOut, refreshMember);
      return { ok: true as const };
    } catch {
      await ensureAppUsersLoaded();
      const localMember = activateLocalMode(user);
      setLocalMode(true);
      setMember(localMember);
      setLoggedOut(false);
      return { ok: true as const };
    } finally {
      setLoading(false);
    }
  }, [refreshMember]);

  useEffect(() => {
    ensureAppUsersLoaded()
      .then(() => getStoredUser())
      .then((user) =>
        bootstrapSession(user, setSession, setMember, setLocalMode, setLoggedOut, refreshMember)
      )
      .catch(() =>
        ensureAppUsersLoaded()
          .then(() => getStoredUser())
          .then((user) => {
            const localMember = activateLocalMode(user);
            setLocalMode(true);
            setMember(localMember);
            setLoggedOut(false);
          })
      )
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isLocalMode() && !loggedOut) {
        setSession(s);
        if (s) refreshMember();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshMember, loggedOut]);

  const value = useMemo(
    () => ({ session, member, loading, localMode, loggedOut, refreshMember, signOut, signIn }),
    [session, member, loading, localMode, loggedOut, refreshMember, signOut, signIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
