import { environmentFile, validateEnvironment } from './environment';

const valid = {
  NODE_ENV: 'test', PORT: '3000', CORS_ORIGIN: 'http://localhost:5173',
  POSTGRES_HOST: 'localhost', POSTGRES_PORT: '5432', POSTGRES_USER: 'test',
  POSTGRES_PASSWORD: 'test-only-password', POSTGRES_DB: 'gamenest_test',
  JWT_ACCESS_SECRET: 'a-private-test-secret-of-at-least-32-characters',
};

describe('Environment validation', () => {
  it('converts ports and supplies bounded token lifetimes', () => {
    const env = validateEnvironment(valid);
    expect(env.PORT).toBe(3000);
    expect(env.POSTGRES_PORT).toBe(5432);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_SECONDS).toBe(2592000);
  });

  it.each([
    ['POSTGRES_PORT', 'not-a-port'], ['PORT', '65536'], ['POSTGRES_DB', ''],
    ['JWT_ACCESS_SECRET', 'replace-with-a-random-secret'], ['JWT_ACCESS_TTL_SECONDS', '0'],
    ['CORS_ORIGIN', '*'], ['CORS_ORIGIN', 'https://example.com/path'], ['NODE_ENV', 'invalid'],
  ])('rejects invalid %s without disclosing its value', (key, value) => {
    expect(() => validateEnvironment({ ...valid, [key]: value })).toThrow(`Invalid environment variables: ${key}`);
  });

  it('accepts multiple explicit origins', () => {
    expect(validateEnvironment({ ...valid, CORS_ORIGIN: 'http://localhost:5173,https://example.com' }).CORS_ORIGIN)
      .toBe('http://localhost:5173,https://example.com');
  });

  it.each(['test', 'production'])('does not load development secrets in %s', (nodeEnv) => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = nodeEnv;
      expect(environmentFile()).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});
