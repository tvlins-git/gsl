import {
  ADMIN_USER_ID,
  type AppUser,
  type AppUserRole,
} from '@/constants/hardcoded-user';
import { listAppUsers } from './app-users';
import { getGroupMembers } from './auth';
import type { Member } from './database.types';
import { isLocalMode } from './local-store';
import { isSupabaseConfigured } from './supabase';

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug || 'user';
}

function roleFromMember(member: Member): AppUserRole {
  return member.role === 'admin' ? 'admin' : 'member';
}

/**
 * Build an AppUser row for a remote member that is not on this device's login roster.
 * Email follows the same `{slug}@gsl.local` convention as Profile create.
 */
export function appUserFromRemoteMember(member: Member): AppUser {
  const displayName = member.display_name.trim() || 'Member';
  const isSeedAdmin = displayName.toLowerCase() === 'hr. lins';
  const id = isSeedAdmin ? ADMIN_USER_ID : slugify(displayName);
  return {
    id,
    email: isSeedAdmin ? 'hr.lins@gsl.local' : `${id}@gsl.local`,
    password: '',
    displayName,
    role: roleFromMember(member),
    localMemberId: member.id,
    localUserId: member.user_id,
  };
}

/**
 * Merge a live `public.members` row with the matching local login account (by display name).
 * Prefer local credentials / ids when present so delete and password reset keep working.
 */
export function mergeMemberWithLocalUsers(member: Member, localUsers: AppUser[]): AppUser {
  const name = member.display_name.trim().toLowerCase();
  const local = localUsers.find((user) => user.displayName.trim().toLowerCase() === name);
  if (!local) {
    return appUserFromRemoteMember(member);
  }
  return {
    ...local,
    role: roleFromMember(member) === 'admin' ? 'admin' : local.role,
    displayName: member.display_name.trim() || local.displayName,
    localMemberId: member.id || local.localMemberId,
    localUserId: member.user_id || local.localUserId,
  };
}

/**
 * Profile → Users list source of truth.
 *
 * - Local mode / logged out / no group: device AsyncStorage login roster.
 * - Signed-in Supabase session: live `public.members` for the group (merged with
 *   local login rows so create/delete still have emails and local ids).
 *
 * This closes the multi-device gap where User A created on phone B exists in
 * `members` but never appears on phone A's Profile list.
 */
export async function listManagedGroupUsers(groupId: string | null | undefined): Promise<AppUser[]> {
  if (!groupId || isLocalMode() || !isSupabaseConfigured()) {
    return listAppUsers();
  }

  const [localUsers, members] = await Promise.all([listAppUsers(), getGroupMembers(groupId)]);
  if (!members.length) {
    return localUsers;
  }

  return members.map((member) => mergeMemberWithLocalUsers(member, localUsers));
}
