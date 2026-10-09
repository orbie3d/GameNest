import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { configureApi } from '../app/configure-api';
import { UserEntity } from '../users/user.entity';
import { AuthSessionEntity } from './auth-session.entity';
import { AuthResponseDto } from './auth.dto';

const integration = process.env.RUN_AUTH_INTEGRATION === 'true' ? describe : describe.skip;

integration('Authentication with PostgreSQL and migrations', () => {
  let app: INestApplication;
  let source: DataSource;
  let base: string;
  let primary: AuthResponseDto;
  let anotherSession: AuthResponseDto;
  const password = 'Private-integration-password';
  const email = 'player@example.com';
  const post = (path: string, body: unknown, token?: string) => fetch(`${base}/api/v1/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const me = (token: string) => fetch(`${base}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    // The explicit test database prevents accidental use of development data.
    if (process.env.NODE_ENV !== 'test' || process.env.POSTGRES_DB !== 'gamenest_test') {
      throw new Error('Authentication integration tests require the isolated gamenest_test database');
    }
    const { AppModule } = await import('../app/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    source = app.get(DataSource);
    expect((await source.runMigrations()).length).toBe(1);
    expect((await source.runMigrations()).length).toBe(0);
    configureApi(app, ['http://localhost:5173']);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  }, 30000);

  afterAll(async () => {
    try {
      if (source?.isInitialized) {
        await source.undoLastMigration();
        const result = await source.query("SELECT to_regclass('public.users') AS users, to_regclass('public.auth_sessions') AS sessions") as { users: string | null; sessions: string | null }[];
        expect(result[0]).toEqual({ users: null, sessions: null });
      }
    } finally {
      await app?.close();
    }
  });

  it('registers an account, returns safe fields and stores only token and password hashes', async () => {
    const response = await post('auth/register', { email: ' Player@Example.com ', password, displayName: ' Player ' });
    expect(response.status).toBe(201);
    primary = await response.json() as AuthResponseDto;
    expect(primary.user.email).toBe(email);
    expect(primary.user.displayName).toBe('Player');
    expect(Object.keys(primary.user).sort()).toEqual(['createdAt', 'displayName', 'email', 'id']);
    const stored = await source.getRepository(UserEntity).createQueryBuilder('user').addSelect('user.passwordHash')
      .where('user.id = :id', { id: primary.user.id }).getOneOrFail();
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(stored.passwordHash === password).toBe(false);
    const session = await source.getRepository(AuthSessionEntity).createQueryBuilder('session').addSelect('session.refreshTokenHash')
      .where('session.userId = :id', { id: primary.user.id }).getOneOrFail();
    expect(session.refreshTokenHash === createHash('sha256').update(primary.refreshToken).digest('hex')).toBe(true);
    expect(primary.refreshToken.length).toBe(86);
    expect((await me(primary.accessToken)).status).toBe(200);
  });

  it('rejects duplicate normalized emails, including concurrent registrations', async () => {
    expect((await post('auth/register', { email: 'PLAYER@EXAMPLE.COM', password, displayName: 'Another' })).status).toBe(409);
    const responses = await Promise.all([1, 2].map(() => post('auth/register', { email: 'race@example.com', password, displayName: 'Race' })));
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await source.getRepository(UserEntity).countBy({ email: 'race@example.com' })).toBe(1);
  });

  it('authenticates valid credentials and rejects wrong or unknown credentials identically', async () => {
    const response = await post('auth/login', { email: 'PLAYER@EXAMPLE.COM', password });
    expect(response.status).toBe(200);
    const login = await response.json() as AuthResponseDto;
    anotherSession = login;
    expect(login.user.id).toBe(primary.user.id);
    expect((await me(login.accessToken)).status).toBe(200);
    const wrong = await post('auth/login', { email, password: 'Wrong-integration-password' });
    const unknown = await post('auth/login', { email: 'unknown@example.com', password });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it('rotates refresh tokens and rejects replay of the consumed token', async () => {
    const old = primary.refreshToken;
    const response = await post('auth/refresh', { refreshToken: old });
    expect(response.status).toBe(200);
    const rotated = await response.json() as AuthResponseDto;
    expect(rotated.refreshToken === old).toBe(false);
    expect(rotated.refreshExpiresAt).toBe(primary.refreshExpiresAt);
    expect((await post('auth/refresh', { refreshToken: old })).status).toBe(401);
    expect((await me(rotated.accessToken)).status).toBe(200);
    primary = rotated;
  });

  it('permits only one concurrent consumption of a refresh token', async () => {
    const responses = await Promise.all([1, 2].map(() => post('auth/refresh', { refreshToken: primary.refreshToken })));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    primary = await responses.find((response) => response.status === 200)!.json() as AuthResponseDto;
  });

  it('rejects inactive accounts for login, refresh and existing access', async () => {
    const repository = source.getRepository(UserEntity);
    await repository.update(primary.user.id, { isActive: false });
    try {
      expect((await post('auth/login', { email, password })).status).toBe(401);
      expect((await post('auth/refresh', { refreshToken: primary.refreshToken })).status).toBe(401);
      expect((await me(primary.accessToken)).status).toBe(401);
    } finally {
      await repository.update(primary.user.id, { isActive: true });
    }
  });

  it('rejects expired or forged JWTs and tokens with malformed subject or session claims', async () => {
    const jwt = app.get(JwtService);
    const session = await source.getRepository(AuthSessionEntity).findOneByOrFail({ userId: primary.user.id });
    const expired = await jwt.signAsync({ sub: primary.user.id, sid: session.id }, { expiresIn: -1 });
    const malformed = await jwt.signAsync({ sub: 'not-a-uuid', sid: randomUUID() }, { expiresIn: 900 });
    const absentSession = await jwt.signAsync({ sub: primary.user.id, sid: randomUUID() }, { expiresIn: 900 });
    expect((await me(expired)).status).toBe(401);
    expect((await me(malformed)).status).toBe(401);
    expect((await me(absentSession)).status).toBe(401);
    expect((await me(`${primary.accessToken}modified`)).status).toBe(401);
  });

  it('rejects expired sessions even when the JWT remains cryptographically valid', async () => {
    const loginResponse = await post('auth/login', { email, password });
    const login = await loginResponse.json() as AuthResponseDto;
    const jwt = app.get(JwtService);
    const payload = jwt.decode<{ sid: string }>(login.accessToken);
    // Move both dates so the migration expiration constraint still holds.
    await source.query('UPDATE auth_sessions SET created_at = now() - interval \'2 days\', expires_at = now() - interval \'1 day\' WHERE id = $1', [payload.sid]);
    expect((await me(login.accessToken)).status).toBe(401);
    expect((await post('auth/refresh', { refreshToken: login.refreshToken })).status).toBe(401);
  });

  it('isolates accounts and logs out only the current session', async () => {
    const otherResponse = await post('auth/register', { email: 'other@example.com', password, displayName: 'Other' });
    expect(otherResponse.status).toBe(201);
    const other = await otherResponse.json() as AuthResponseDto;
    const ownProfile = await (await me(primary.accessToken)).json() as { id: string };
    const otherProfile = await (await me(other.accessToken)).json() as { id: string };
    expect(ownProfile.id).toBe(primary.user.id);
    expect(otherProfile.id).toBe(other.user.id);
    expect((await post('auth/logout', {}, primary.accessToken)).status).toBe(204);
    expect((await me(primary.accessToken)).status).toBe(401);
    expect((await post('auth/refresh', { refreshToken: primary.refreshToken })).status).toBe(401);
    expect((await me(anotherSession.accessToken)).status).toBe(200);
    expect((await me(other.accessToken)).status).toBe(200);
  });

  it('keeps schema synchronization disabled', () => {
    expect(source.options.synchronize).toBe(false);
    expect(app.get(ConfigService).get('NODE_ENV')).toBe('test');
  });
});
