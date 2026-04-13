import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FileDeleteDto {
  @ApiProperty({
    description:
      'Полный URL файла: базовый URL + type + id + name (как в ответе загрузки)',
    example: 'https://storage.com/public/1/image.webp',
  })
  @IsNotEmpty({ message: 'path обязателен' })
  @IsString()
  path: string;
}
