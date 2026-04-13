import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FileResizeFit, FileResizePosition } from '@/app/enums/enum';

export class FileResizeCreateDto {
  @ApiProperty({
    description: 'Ширина изображения в пикселях',
    minimum: 10,
    maximum: 4096,
    example: 300,
  })
  @IsInt({ message: 'Width должен быть целым числом' })
  @Min(10, { message: 'Width должен быть не менее 10px' })
  @Max(4096, { message: 'Width должен быть не более 4096px' })
  width: number;

  @ApiProperty({
    description: 'Высота изображения в пикселях',
    minimum: 10,
    maximum: 4096,
    example: 300,
  })
  @IsInt({ message: 'Height должен быть целым числом' })
  @Min(10, { message: 'Height должен быть не менее 10px' })
  @Max(4096, { message: 'Height должен быть не более 4096px' })
  height: number;

  @ApiProperty({
    description: 'Стратегия изменения размера',
    enum: FileResizeFit,
    enumName: 'FileResizeFit',
    default: FileResizeFit.COVER,
    required: false,
    example: FileResizeFit.COVER,
  })
  @IsOptional()
  @IsEnum(FileResizeFit, {
    message: `Fit должен быть одним из: ${Object.values(FileResizeFit).join(', ')}`,
  })
  fit?: FileResizeFit;

  @ApiProperty({
    description: 'Позиция обрезки (для cover/contain)',
    enum: FileResizePosition,
    enumName: 'FileResizePosition',
    default: FileResizePosition.CENTER,
    required: false,
    example: FileResizePosition.CENTER,
  })
  @IsOptional()
  @IsEnum(FileResizePosition, {
    message: `Position должен быть одним из: ${Object.values(FileResizePosition).join(', ')}`,
  })
  position?: FileResizePosition;

  @ApiProperty({
    description: 'Цвет фона для стратегии contain (hex или rgba)',
    default: '#ffffff',
    required: false,
    example: '#ffffff',
  })
  @IsOptional()
  @IsString()
  background?: string;
}
