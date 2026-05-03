import { FileUpdateDto } from '@/app/dtos/[type]/[id]/[name]/update';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class FilesUpdateDto extends FileUpdateDto {
  @ApiProperty({
    description:
      'Полный URL файла: `SERVICE_URL` / `STORAGE_URL` + type + id + name',
    example: 'https://storage.com/public/1/image.webp',
  })
  @IsNotEmpty({ message: 'path обязателен' })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    description: 'Идентификатор операции клиента',
    minimum: 0,
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: 'transaction_id должен быть целым числом',
  })
  @Min(0, {
    message: 'transaction_id не может быть отрицательным',
  })
  transaction_id?: number;
}
