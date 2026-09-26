import { passwordForAuth } from '@/lib/auth-password';

describe('passwordForAuth', () => {
  it('leaves passwords that already meet the Auth minimum', () => {
    expect(passwordForAuth('thomas')).toBe('thomas');
    expect(passwordForAuth('secret')).toBe('secret');
  });

  it('pads shorter app passwords to 6 characters', () => {
    expect(passwordForAuth('test')).toBe('testgs');
    expect(passwordForAuth('abcd')).toBe('abcdgs');
    expect(passwordForAuth('abcde')).toBe('abcdeg');
  });
});
