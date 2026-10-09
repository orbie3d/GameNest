import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from '../app/app.controller';
import { AppService } from '../app/app.service';
import { configureApi } from '../app/configure-api';
import { UsersController } from '../users/users.controller';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('Auth HTTP contracts and Swagger', () => {
  let app: INestApplication;
  let base: string;
  const user = { id: 'f693c3b1-337d-4d07-9476-2b64f974bcbe', email: 'player@example.com', displayName: 'Player', createdAt: new Date().toISOString() };
  const auth = {
    register: jest.fn(), login: jest.fn(), refresh: jest.fn(), logout: jest.fn(), authenticateAccessToken: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [AuthController, UsersController, AppController],
      providers: [AppService, AccessTokenGuard, { provide: AuthService, useValue: auth }, { provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApi(app, ['http://localhost:5173']);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.resetAllMocks(); });

  it('documents DTOs, response schemas, statuses and protected routes', async () => {
    const response = await fetch(`${base}/api/v1/openapi.json`);
    expect(response.status).toBe(200);
    const document = await response.json() as {
      paths: Record<string, { post?: { responses: Record<string, unknown>; requestBody?: unknown }; get?: { security?: unknown } }>;
      components: { schemas: Record<string, { properties: Record<string, unknown> }> };
    };
    expect(document.paths['/api/v1/auth/register'].post?.responses['201']).toBeDefined();
    expect(document.paths['/api/v1/auth/register'].post?.responses['409']).toBeDefined();
    expect(document.paths['/api/v1/auth/login'].post?.responses['401']).toBeDefined();
    expect(document.paths['/api/v1/auth/register'].post?.requestBody).toBeDefined();
    expect(document.paths['/api/v1/users/me'].get?.security).toEqual([{ 'access-token': [] }]);
    expect(Object.keys(document.components.schemas.RegisterDto.properties).sort()).toEqual(['displayName', 'email', 'password']);
    expect(document.components.schemas.AuthResponseDto).toBeDefined();
    expect(document.components.schemas.ApiErrorDto).toBeDefined();
    const ui = await fetch(`${base}/api/v1/docs/`);
    expect(ui.status).toBe(200);
    expect(await ui.text()).toContain('swagger-ui');
    expect((await fetch(`${base}/api/v1/docs/swagger-ui-init.js`)).status).toBe(200);
  });

  it('preserves the existing application endpoint', async () => {
    const response = await fetch(`${base}/api/v1`);
    expect(await response.json()).toEqual({ message: 'Hello API' });
  });

  it('normalizes identity fields but preserves passwords', async () => {
    auth.register.mockResolvedValue({ user });
    const response = await fetch(`${base}/api/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ' Player@Example.com ', displayName: ' Player ', password: '  private-test-password  ' }),
    });
    expect(response.status).toBe(201);
    expect(auth.register.mock.calls[0][0].email).toBe('player@example.com');
    expect(auth.register.mock.calls[0][0].displayName).toBe('Player');
    expect(auth.register.mock.calls[0][0].password === '  private-test-password  ').toBe(true);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    { email: 'bad', password: 'short', displayName: 'A' },
    { email: 'player@example.com', password: 'test-password-long', displayName: 'Player', isActive: true },
    { email: ['player@example.com'], password: 'test-password-long', displayName: 'Player' },
  ])('rejects invalid or extra registration fields before calling the service', async (body) => {
    const response = await fetch(`${base}/api/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
    expect(auth.register).not.toHaveBeenCalled();
    const error = await response.json() as { statusCode: number; error: string; message: unknown };
    expect(error.statusCode).toBe(400);
    expect(error.error).toBe('BAD_REQUEST');
    expect(Array.isArray(error.message)).toBe(true);
  });

  it('rejects malformed refresh tokens', async () => {
    const response = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: 'invalid' }),
    });
    expect(response.status).toBe(400);
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('returns documented conflicts without internal details', async () => {
    auth.register.mockRejectedValue(new ConflictException('Email is already registered'));
    const response = await fetch(`${base}/api/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'private-test-password', displayName: user.displayName }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ statusCode: 409, error: 'CONFLICT', message: 'Email is already registered' });
  });

  it('hides internal exceptions from clients', async () => {
    auth.login.mockRejectedValue(new InternalServerErrorException('SQL and other internal details'));
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'private-test-password' }),
    });
    expect(await response.json()).toEqual({ statusCode: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  });

  it('requires a valid bearer token for account access', async () => {
    expect((await fetch(`${base}/api/v1/users/me`)).status).toBe(401);
    expect((await fetch(`${base}/api/v1/users/me`, { headers: { Authorization: 'Basic invalid' } })).status).toBe(401);
    auth.authenticateAccessToken.mockRejectedValueOnce(new UnauthorizedException('Invalid or expired access token'));
    expect((await fetch(`${base}/api/v1/users/me`, { headers: { Authorization: 'Bearer invalid' } })).status).toBe(401);
    auth.authenticateAccessToken.mockResolvedValue({ user, sessionId: 'test-session' });
    const response = await fetch(`${base}/api/v1/users/me`, { headers: { Authorization: 'Bearer test-only-token' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(user);
  });

  it('applies explicit CORS origins and security headers', async () => {
    const allowed = await fetch(`${base}/api/v1`, { headers: { Origin: 'http://localhost:5173' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(allowed.headers.get('x-content-type-options')).toBe('nosniff');
    expect(allowed.headers.get('content-security-policy')).toContain("script-src 'self'");
    const denied = await fetch(`${base}/api/v1`, { headers: { Origin: 'https://untrusted.example' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('limits repeated authentication requests', async () => {
    auth.login.mockRejectedValue(new UnauthorizedException('Invalid email or password'));
    let limited = false;
    for (let i = 0; i < 11; i++) {
      const response = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'private-test-password' }),
      });
      if (response.status === 429) {
        limited = true;
        const error = await response.json() as { error: string };
        expect(error.error).toBe('TOO_MANY_REQUESTS');
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
