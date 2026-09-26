/** GoTrue's default minimum. The app still accepts 4-character login passwords. */
export const AUTH_PASSWORD_MIN_LENGTH = 6;

const AUTH_PASSWORD_PAD = 'gslgsl';

/**
 * Password sent to Supabase Auth.
 * Shorter app passwords are padded so createUser / sign-in are not rejected
 * with "Password should be at least 6 characters." The value stored on the
 * device stays what the person typed; sign-in applies this same transform.
 *
 * Keep in sync with supabase/functions/create-group-member/index.ts.
 */
export function passwordForAuth(password: string): string {
  if (password.length >= AUTH_PASSWORD_MIN_LENGTH) return password;
  return `${password}${AUTH_PASSWORD_PAD}`.slice(0, AUTH_PASSWORD_MIN_LENGTH);
}
