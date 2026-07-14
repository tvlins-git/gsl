export type HardcodedUser = {
  id: 'hr-lins' | 'hr-andersen';
  email: string;
  password: string;
  displayName: string;
};

/** Hardcoded GSL members for local / demo login */
export const HARDCODED_USERS: HardcodedUser[] = [
  {
    id: 'hr-lins',
    email: 'hr.lins@gsl.local',
    password: 'thomas',
    displayName: 'Hr. Lins',
  },
  {
    id: 'hr-andersen',
    email: 'hr.andersen@gsl.local',
    password: 'jesper',
    displayName: 'Hr. Andersen',
  },
];

export const DEFAULT_HARDCODED_USER = HARDCODED_USERS[0];

export function getHardcodedUser(id: string): HardcodedUser | undefined {
  return HARDCODED_USERS.find((user) => user.id === id);
}
