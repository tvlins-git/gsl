export type AppUserRole = 'admin' | 'member';

/** App login account (local roster + Supabase email identity). */
export type AppUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: AppUserRole;
  localMemberId: string;
  localUserId: string;
};

/** @deprecated Prefer AppUser — kept for existing import sites. */
export type HardcodedUser = AppUser;

export const ADMIN_USER_ID = 'hr-lins';

/** Seeded GSL members for first launch / demo login */
export const HARDCODED_USERS: AppUser[] = [
  {
    id: ADMIN_USER_ID,
    email: 'hr.lins@gsl.local',
    password: 'thomas',
    displayName: 'Hr. Lins',
    role: 'admin',
    localMemberId: '00000000-0000-4000-8000-000000000002',
    localUserId: '00000000-0000-4000-8000-000000000003',
  },
  {
    id: 'hr-andersen',
    email: 'hr.andersen@gsl.local',
    password: 'jesper',
    displayName: 'Hr. Andersen',
    role: 'member',
    localMemberId: '00000000-0000-4000-8000-000000000004',
    localUserId: '00000000-0000-4000-8000-000000000005',
  },
];

export const DEFAULT_HARDCODED_USER = HARDCODED_USERS[0];

export function getHardcodedUser(id: string): AppUser | undefined {
  return HARDCODED_USERS.find((user) => user.id === id);
}

export function isAdminUser(user: Pick<AppUser, 'id' | 'role'> | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.id === ADMIN_USER_ID;
}
