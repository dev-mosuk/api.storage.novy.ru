import { FileUserUpdateDto } from '@/app/dtos/[type]/[id]/[name]/(users)/update';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Поля обновления для `PATCH /{type}/{id}/{name}` (без `path` в теле). */
export class FileUpdateDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Владелец файла (`files.user_id`). `null` - сбросить',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt({ message: 'user_id должен быть целым числом' })
  @Type(() => Number)
  user_id?: number | null;

  @ApiProperty({
    required: false,
    description: 'Файл подтверждён во внешней системе',
  })
  @IsOptional()
  @IsBoolean({ message: 'verified должен быть boolean' })
  verified?: boolean;

  @ApiPropertyOptional({
    type: () => [FileUserUpdateDto],
    description:
      'Список пользователей: объекты `{ user_id }` (как в ответе GET, без `id`/`file_id`). Пустой массив — очистить.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUserUpdateDto)
  users?: FileUserUpdateDto[];
}
