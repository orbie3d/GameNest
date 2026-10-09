import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiErrorDto } from '../app/api-error.dto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAccount } from '../auth/authenticated-account';
import type { AuthenticatedAccount } from '../auth/authenticated-account';
import { UserResponseDto } from './user-response.dto';

@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiResponse({ status: 429, type: ApiErrorDto })
@UseGuards(AccessTokenGuard)
@Controller('users')
export class UsersController {
  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consultar la cuenta de la sesión actual' })
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentAccount() account: AuthenticatedAccount): UserResponseDto {
    return account.user;
  }
}
