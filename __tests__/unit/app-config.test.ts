import type { ConfigContext } from 'expo/config';
import appConfig from '../../app.config';

const APPLICATION_ID = 'com.tvlins.gsl';

describe('native application ids', () => {
  const config = appConfig({ config: {} } as ConfigContext);

  it('uses com.tvlins.gsl for iOS and Android', () => {
    expect(config.ios?.bundleIdentifier).toBe(APPLICATION_ID);
    expect(config.android?.package).toBe(APPLICATION_ID);
  });

  it('keeps the GSL name and gsl slug', () => {
    expect(config.name).toBe('GSL');
    expect(config.slug).toBe('gsl');
    expect(config.scheme).toBe('gsl');
  });
});
