import { Body, Controller, Header, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorDto } from '../app/api-error.dto';
import { AccessTokenGuard } from './access-token.guard';
import { AuthResponseDto, LoginDto, RefreshDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';
import { CurrentAccount } from './authenticated-account';
import type { AuthenticatedAccount } from './authenticated-account';

@ApiTags('Autenticación')
@ApiBadRequestResponse({ description: 'Datos inválidos o propiedades no permitidas.', type: ApiErrorDto })
@ApiResponse({ status: 429, description: 'Demasiadas solicitudes; reintentar más tarde.', type: ApiErrorDto })
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Crear una cuenta e iniciar una sesión' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'El correo ya está registrado.', type: ApiErrorDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas o cuenta inactiva.', type: ApiErrorDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Rotar el refresh token y obtener un nuevo access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido, vencido, consumido o revocado; cuenta inactiva.', type: ApiErrorDto })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar la sesión del access token actual' })
  @ApiNoContentResponse({ description: 'Sesión revocada; sus tokens dejan de autorizar acceso.' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  logout(@CurrentAccount() account: AuthenticatedAccount): Promise<void> {
    return this.auth.logout(account);
  }
}
