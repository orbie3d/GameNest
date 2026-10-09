import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { UserResponseDto } from '../users/user-response.dto';

function normalizeEmail({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class LoginDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'player@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password', example: 'A-long-example-password' })
  @IsString()
  @Length(12, 128)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 80, example: 'Player One' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 80)
  displayName!: string;
}

export class RefreshDto {
  @ApiProperty({ minLength: 86, maxLength: 86, description: 'Token opaco recibido en registro, login o refresh.' })
  @IsString()
  @Length(86, 86)
  @Matches(/^[A-Za-z0-9_-]{86}$/)
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ description: 'JWT para Authorization: Bearer <accessToken>.' })
  accessToken!: string;

  @ApiProperty({ description: 'Token opaco rotativo; conservar de forma privada.' })
  refreshToken!: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900, description: 'Duración del access token en segundos.' })
  expiresIn!: number;

  @ApiProperty({ type: String, format: 'date-time', description: 'Vencimiento absoluto de la sesión.' })
  refreshExpiresAt!: string;
}
