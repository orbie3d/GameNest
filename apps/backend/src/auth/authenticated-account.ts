import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { UserResponseDto } from '../users/user-response.dto';

export interface AuthenticatedAccount {
  user: UserResponseDto;
  sessionId: string;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  account?: AuthenticatedAccount;
}

export const CurrentAccount = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedAccount => {
  const account = context.switchToHttp().getRequest<AuthenticatedRequest>().account;
  if (!account) throw new UnauthorizedException('Authentication required');
  return account;
});
