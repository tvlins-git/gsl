import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ADMIN_USER_ID,
  DEFAULT_HARDCODED_USER,
  HARDCODED_USERS,
  type AppUser,
  type AppUserRole,
} from '@/constants/hardcoded-user';

const STORAGE_KEY = 'gsl_app_users_v1';

let cachedUsers: AppUser[] | null = null;

/** Test helper — clears in-memory cache between jest cases. */
export function __resetAppUsersCacheForTests() {
  cachedUsers = null;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug || 'user';
}

function normalizeUser(raw: Partial<AppUser> & Pick<AppUser, 'id' | 'displayName'>): AppUser {
  const seed = HARDCODED_USERS.find((user) => user.id === raw.id);
  return {
    id: raw.id,
    email: raw.email ?? seed?.email ?? `${slugify(raw.displayName)}@gsl.local`,
    password: raw.password ?? seed?.password ?? 'password',
    displayName: raw.displayName,
    role: raw.role ?? seed?.role ?? 'member',
    localMemberId: raw.localMemberId ?? seed?.localMemberId ?? uuid(),
    localUserId: raw.localUserId ?? seed?.localUserId ?? uuid(),
  };
}

function ensureAdminPresent(users: AppUser[]): AppUser[] {
  const adminSeed = HARDCODED_USERS.find((user) => user.id === ADMIN_USER_ID)!;
  const withoutDupAdmin = users.filter((user) => user.id !== ADMIN_USER_ID);
  const existingAdmin = users.find((user) => user.id === ADMIN_USER_ID);
  const admin = normalizeUser({
    ...adminSeed,
    ...existingAdmin,
    id: ADMIN_USER_ID,
    role: 'admin',
    displayName: existingAdmin?.displayName || adminSeed.displayName,
    email: existingAdmin?.email || adminSeed.email,
    password: existingAdmin?.password || adminSeed.password,
    localMemberId: existingAdmin?.localMemberId || adminSeed.localMemberId,
    localUserId: existingAdmin?.localUserId || adminSeed.localUserId,
  });
  return [admin, ...withoutDupAdmin.map(normalizeUser)];
}

async function persist(users: AppUser[]) {
  cachedUsers = users;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export async function ensureAppUsersLoaded(): Promise<AppUser[]> {
  if (cachedUsers) return cachedUsers;

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = HARDCODED_USERS.map((user) => ({ ...user }));
    await persist(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as AppUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = HARDCODED_USERS.map((user) => ({ ...user }));
      await persist(seeded);
      return seeded;
    }
    const normalized = ensureAdminPresent(parsed);
    await persist(normalized);
    return normalized;
  } catch {
    const seeded = HARDCODED_USERS.map((user) => ({ ...user }));
    await persist(seeded);
    return seeded;
  }
}

/** Sync read — falls back to seed until AsyncStorage has been loaded. */
export function getAppUsersSync(): AppUser[] {
  return cachedUsers ?? HARDCODED_USERS;
}

export async function listAppUsers(): Promise<AppUser[]> {
  return ensureAppUsersLoaded();
}

export async function getAppUser(id: string): Promise<AppUser | undefined> {
  const users = await ensureAppUsersLoaded();
  return users.find((user) => user.id === id);
}

export function getAppUserSync(id: string): AppUser | undefined {
  return getAppUsersSync().find((user) => user.id === id);
}

export async function createAppUser(input: {
  displayName: string;
  password: string;
  role?: AppUserRole;
}): Promise<{ ok: true; user: AppUser } | { ok: false; error: string }> {
  const displayName = input.displayName.trim();
  const password = input.password.trim();

  if (!displayName) {
    return { ok: false, error: 'Enter a display name.' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const users = await ensureAppUsersLoaded();
  const duplicate = users.some(
    (user) => user.displayName.toLowerCase() === displayName.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: 'A user with that name already exists.' };
  }

  let baseId = slugify(displayName);
  let id = baseId;
  let n = 2;
  while (users.some((user) => user.id === id) || id === ADMIN_USER_ID) {
    id = `${baseId}-${n}`;
    n += 1;
  }

  const user: AppUser = {
    id,
    email: `${id}@gsl.local`,
    password,
    displayName,
    role: input.role === 'admin' ? 'admin' : 'member',
    localMemberId: uuid(),
    localUserId: uuid(),
  };

  await persist([...users, user]);
  return { ok: true, user };
}

export async function deleteAppUser(
  userId: string,
  actingUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (userId === ADMIN_USER_ID) {
    return { ok: false, error: 'The main admin cannot be deleted.' };
  }
  if (userId === actingUserId) {
    return { ok: false, error: 'You cannot delete your own account.' };
  }

  const users = await ensureAppUsersLoaded();
  const target = users.find((user) => user.id === userId);
  if (!target) {
    return { ok: false, error: 'User not found.' };
  }
  if (target.role === 'admin') {
    return { ok: false, error: 'Admin users cannot be deleted.' };
  }

  await persist(users.filter((user) => user.id !== userId));
  return { ok: true };
}

export function resolveSignedInAppUser(memberDisplayName: string | null | undefined): AppUser | undefined {
  if (!memberDisplayName) return undefined;
  return getAppUsersSync().find((user) => user.displayName === memberDisplayName);
}

export { DEFAULT_HARDCODED_USER, ADMIN_USER_ID };
