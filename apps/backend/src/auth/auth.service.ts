import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { Options } from '@node-rs/argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull, QueryFailedError } from 'typeorm';
import { isUUID } from 'class-validator';
import { UserEntity } from '../users/user.entity';
import { userResponse } from '../users/user-response.dto';
import { AuthSessionEntity } from './auth-session.entity';
import { AuthResponseDto, LoginDto, RegisterDto } from './auth.dto';
import type { AuthenticatedAccount } from './authenticated-account';

// Argon2id is enum value 2; the library's ambient const enum cannot be imported with isolatedModules.
const passwordOptions: Options = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

function refreshHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isDuplicateEmail(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  // TypeORM exposes the driver error without a strict shape; narrow it here.
  const details: unknown = error.driverError;
  return typeof details === 'object' && details !== null
    && 'code' in details && details.code === '23505'
    && 'constraint' in details && details.constraint === 'users_email_unique';
}

@Injectable()
export class AuthService {
  // Unknown emails still perform password verification to reduce timing differences.
  private readonly dummyHash = hash(randomBytes(32).toString('hex'), passwordOptions);

  constructor(
    private readonly source: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await hash(dto.password, passwordOptions);
    try {
      return await this.source.transaction(async (manager) => {
        const user = manager.create(UserEntity, {
          id: randomUUID(), email: dto.email, displayName: dto.displayName, passwordHash, isActive: true,
        });
        await manager.save(user);
        return this.createSession(manager, user);
      });
    } catch (error: unknown) {
      if (isDuplicateEmail(error)) throw new ConflictException('Email is already registered');
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.source.getRepository(UserEntity).createQueryBuilder('user')
      .addSelect('user.passwordHash').where('user.email = :email', { email: dto.email }).getOne();
    const valid = await verify(user?.passwordHash ?? await this.dummyHash, dto.password);
    if (!user || !valid || !user.isActive) throw new UnauthorizedException('Invalid email or password');
    return this.source.transaction(async (manager) => {
      // Recheck account state within the session transaction.
      const currentUser = await manager.findOne(UserEntity, {
        where: { id: user.id, isActive: true }, lock: { mode: 'pessimistic_read' },
      });
      if (!currentUser) throw new UnauthorizedException('Invalid email or password');
      return this.createSession(manager, currentUser);
    });
  }

  async refresh(token: string): Promise<AuthResponseDto> {
    return this.source.transaction(async (manager) => {
      // The lock serializes refreshes so a token can be consumed only once.
      const session = await manager.getRepository(AuthSessionEntity).createQueryBuilder('session')
        .where('session.refreshTokenHash = :hash', { hash: refreshHash(token) })
        .setLock('pessimistic_write').getOne();
      if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      const user = await manager.findOne(UserEntity, {
        where: { id: session.userId, isActive: true }, lock: { mode: 'pessimistic_read' },
      });
      if (!user) throw new UnauthorizedException('Invalid or expired refresh token');
      const refreshToken = randomBytes(64).toString('base64url');
      session.refreshTokenHash = refreshHash(refreshToken);
      await manager.save(session);
      return this.tokenResponse(user, session, refreshToken);
    });
  }

  async logout(account: AuthenticatedAccount): Promise<void> {
    await this.source.getRepository(AuthSessionEntity).update(
      { id: account.sessionId, userId: account.user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedAccount> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)
      || typeof payload.sid !== 'string' || !isUUID(payload.sid)) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    const session = await this.source.getRepository(AuthSessionEntity).findOne({
      where: { id: payload.sid, userId: payload.sub, revokedAt: IsNull() }, relations: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return { user: userResponse(session.user), sessionId: session.id };
  }

  private async createSession(manager: EntityManager, user: UserEntity): Promise<AuthResponseDto> {
    const refreshToken = randomBytes(64).toString('base64url');
    const ttl = this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS');
    const session = manager.create(AuthSessionEntity, {
      id: randomUUID(), userId: user.id, refreshTokenHash: refreshHash(refreshToken),
      expiresAt: new Date(Date.now() + ttl * 1000), revokedAt: null,
    });
    await manager.save(session);
    return this.tokenResponse(user, session, refreshToken);
  }

  private async tokenResponse(user: UserEntity, session: AuthSessionEntity, refreshToken: string): Promise<AuthResponseDto> {
    const expiresIn = this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
    const accessToken = await this.jwt.signAsync({ sub: user.id, sid: session.id, jti: randomUUID() }, { expiresIn });
    return {
      user: userResponse(user), accessToken, refreshToken, tokenType: 'Bearer',
      expiresIn, refreshExpiresAt: session.expiresAt.toISOString(),
    };
  }
}
