import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class FileUserUpdateDto {
  @ApiProperty({ description: 'id пользователя с доступом' })
  @IsInt({ message: 'user_id должен быть целым числом' })
  user_id: number;
}
