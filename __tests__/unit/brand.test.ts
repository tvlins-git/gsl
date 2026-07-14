import { APP_NAME, DEFAULT_GROUP_NAME } from '@/constants/brand';

describe('GSL branding constants', () => {
  it('uses GSL as app name', () => {
    expect(APP_NAME).toBe('GSL');
    expect(DEFAULT_GROUP_NAME).toBe('GSL');
  });
});
