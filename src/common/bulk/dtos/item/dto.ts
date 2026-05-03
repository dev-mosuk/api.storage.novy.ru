import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BulkItemDto {
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
