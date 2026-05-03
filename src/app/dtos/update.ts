import { FileUpdateDto } from '@/app/dtos/[type]/[id]/[name]/update';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Элемент массива для `PATCH /` (массовое обновление по полному URL). */
export class FilesUpdateDto extends FileUpdateDto {
  @ApiProperty({
    description:
      'Полный URL файла: `SERVICE_URL` / `STORAGE_URL` + type + id + name',
    example: 'https://storage.com/public/1/image.webp',
  })
  @IsNotEmpty({ message: 'path обязателен' })
  @IsString()
  path: string;
}
