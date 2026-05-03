import { FileDeleteDto } from '@/app/dtos/delete';
import { StorageDeleteProvider } from '@/app/providers/delete';
import { BulkHttpStatusDecorator } from '@/common/bulk/decorators/http/status/decorator';
import { BulkTransaction } from '@/common/bulk/interfaces/transaction/create';
import { AuthenticationDecorator } from '@/shared/microservices/auth/authentication/decorators/decorator';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthenticationGuard } from '@/shared/microservices/auth/authentication/guards/guard';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Файлы')
@Controller()
export class FilesDeleteController {
  constructor(private readonly storageDeleteProvider: StorageDeleteProvider) {}

  @ApiOperation({
    summary: 'Удалить списком',
    description: [
      'Массовое удаление по полному **`path`** файла.',
      '',
      'Опционально **`transaction_id`** (≥0) на элемент массива — correlation id в ответе; без поля совпадает с индексом.',
      '',
      'Удалять может только **автор**, **ADMIN** или **MICROSERVICE**. Нужен **JWT**.',
    ].join('\n'),
  })
  @ApiBearerAuth('JWT')
  @ApiBody({
    description:
      'Массив объектов `{ path }`; опционально **`transaction_id`**. Swagger — модель **`FileDeleteDto`**.',
    type: [FileDeleteDto],
  })
  @ApiOkResponse({
    description: 'Полный успех',
    schema: {
      type: 'array',
      example: [
        {
          transaction_id: 0,
          status: 'success',
          data: { path: 'https://storage.com/public/1/image.webp' },
        },
      ],
    },
  })
  @ApiResponse({
    status: 207,
    description: 'Частичный успех',
    schema: {
      type: 'array',
      example: [
        {
          transaction_id: 0,
          status: 'success',
          data: { path: 'https://storage.com/public/1/image.webp' },
        },
        {
          transaction_id: 1,
          status: 'error',
          errors: { path: 'Файл по указанному path не найден' },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Полная неудача',
    schema: {
      type: 'array',
      example: [
        {
          transaction_id: 0,
          status: 'error',
          errors: {
            path: 'Файл по указанному path не найден',
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Нужен валидный JWT' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  @ApiInternalServerErrorResponse({ description: 'Ошибка сервера' })
  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard)
  @UseInterceptors(AuthenticationInterceptor)
  @BulkHttpStatusDecorator()
  async index(
    @AuthenticationDecorator() authentication: Authentication,
    @Body() dto: FileDeleteDto[],
  ): Promise<BulkTransaction<{ path: string }>[]> {
    return this.storageDeleteProvider.index(authentication, dto);
  }
}
