import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { User } from '@/shared/microservices/auth/users/entities/entity';

export class Authentication {
  @ApiProperty({
    description: 'JWT-токен',
    example: 'abcdefghijklmnopqrstuvwxyz...',
  })
  token?: string;

  @ApiProperty({ description: 'Пользователь', type: () => User })
  user?: {
    id: number;
    role: UserRole;
  };
}
