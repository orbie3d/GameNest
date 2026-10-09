import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { databaseOptions } from '../database/database-options';
import { environmentFile, validateEnvironment } from './environment';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentFile(),
      ignoreEnvFile: process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production',
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => databaseOptions(validateEnvironment({
        NODE_ENV: config.getOrThrow('NODE_ENV'), PORT: config.getOrThrow('PORT'),
        CORS_ORIGIN: config.getOrThrow('CORS_ORIGIN'),
        POSTGRES_HOST: config.getOrThrow('POSTGRES_HOST'), POSTGRES_PORT: config.getOrThrow('POSTGRES_PORT'),
        POSTGRES_USER: config.getOrThrow('POSTGRES_USER'), POSTGRES_PASSWORD: config.getOrThrow('POSTGRES_PASSWORD'),
        POSTGRES_DB: config.getOrThrow('POSTGRES_DB'), JWT_ACCESS_SECRET: config.getOrThrow('JWT_ACCESS_SECRET'),
        JWT_ACCESS_TTL_SECONDS: config.getOrThrow('JWT_ACCESS_TTL_SECONDS'),
        REFRESH_TOKEN_TTL_SECONDS: config.getOrThrow('REFRESH_TOKEN_TTL_SECONDS'),
      })),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
