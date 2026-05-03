import { FileResizeCreateDto } from '@/app/dtos/(resize)/create';
import { FileUserUpdateDto } from '@/app/dtos/[type]/[id]/[name]/(users)/update';
import { FileType } from '@/app/enums/enum';
import { BulkItemDto } from '@/common/bulk/dtos/item/dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class FileCreateDto extends BulkItemDto {
  @ApiProperty({
    description: 'Зона хранения: public или private',
    enum: FileType,
    required: false,
    example: FileType.PUBLIC,
  })
  @IsOptional()
  @IsEnum(FileType, {
    message: 'type должен быть public или private',
  })
  type?: FileType;

  @ApiProperty({
    description: 'Автор',
    required: false,
    example: 42,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt({
    message: 'user_id должен быть целым числом',
  })
  @IsPositive({
    message: 'user_id должен быть положительным числом',
  })
  user_id?: number | null;

  @ApiProperty({
    description: 'Качество сжатия для изображений',
    minimum: 1,
    maximum: 100,
    default: 80,
    required: false,
    example: 85,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quality должен быть целым числом' })
  @Min(1, { message: 'Quality должен быть не менее 1' })
  @Max(100, { message: 'Quality должен быть не более 100' })
  quality?: number;

  @ApiProperty({
    description: 'Параметры изменения размера изображения (JSON в query)',
    type: FileResizeCreateDto,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  })
  @ValidateNested()
  @Type(() => FileResizeCreateDto)
  resize?: FileResizeCreateDto;

  @ApiProperty({
    required: false,
    type: () => [FileUserUpdateDto],
    description:
      'Список пользователей с доступом: объекты `{ user_id }`. Для `private` влияет на чтение; для `public` хранится в БД. Пустой массив — очистить.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUserUpdateDto)
  users?: FileUserUpdateDto[];

  @ApiProperty({
    description:
      'URL файла для импорта (JSON). Для multipart не указывается - файл в `file[n]`.',
    required: false,
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString({
    message: 'path должен быть строкой',
  })
  path?: string;
}
