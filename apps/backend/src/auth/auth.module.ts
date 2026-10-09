import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './access-token.guard';

@Module({
  imports: [JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      signOptions: { algorithm: 'HS256', issuer: 'gamenest-api', audience: 'gamenest-client' },
      verifyOptions: { algorithms: ['HS256'], issuer: 'gamenest-api', audience: 'gamenest-client' },
    }),
  })],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard],
  exports: [AccessTokenGuard, AuthService],
})
export class AuthModule {}
