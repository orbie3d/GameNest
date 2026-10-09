import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from './user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid', example: 'f693c3b1-337d-4d07-9476-2b64f974bcbe' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'player@example.com' })
  email!: string;

  @ApiProperty({ example: 'Player One' })
  displayName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export function userResponse(user: UserEntity): UserResponseDto {
  return { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt.toISOString() };
}
