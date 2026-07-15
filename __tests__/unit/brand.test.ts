import { APP_NAME, APP_VERSION, DEFAULT_GROUP_NAME } from '@/constants/brand';

describe('GSL branding constants', () => {
  it('uses GSL as app name', () => {
    expect(APP_NAME).toBe('GSL');
    expect(DEFAULT_GROUP_NAME).toBe('GSL');
  });

  it('exposes an app version string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
