import { FilesUpdateDto } from '@/app/dtos/update';
import { FileUpdateInterface } from '@/app/interfaces/update';
import { StorageUpdateProvider } from '@/app/providers/update';
import { BulkHttpStatusDecorator } from '@/common/bulk/decorators/http/status/decorator';
import { BulkTransaction } from '@/common/bulk/interfaces/transaction/create';
import { AuthenticationDecorator } from '@/shared/microservices/auth/authentication/decorators/decorator';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthenticationGuard } from '@/shared/microservices/auth/authentication/guards/guard';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
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
export class FilesUpdateController {
  constructor(private readonly storageUpdateProvider: StorageUpdateProvider) {}

  @ApiOperation({
    summary: 'Обновить списком',
    description: [
      'Массовое обновление по полному **`path`** файла (как в URL после загрузки).',
      '',
      'В теле - **`user_id`**, **`verified`** и/или **`users`**.',
      '',
      'Менять может только **автор**, **ADMIN** или **MICROSERVICE**. Нужен **JWT**.',
    ].join('\n'),
  })
  @ApiBearerAuth('JWT')
  @ApiBody({ type: [FilesUpdateDto] })
  @ApiOkResponse({
    description: 'Полный успех',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transaction_id: { type: 'number' },
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              user_id: { type: 'number', nullable: true },
              type: { type: 'string', example: 'public' },
              name: { type: 'string', example: 'a.webp' },
              size: { type: 'number', nullable: true },
              verified: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              users: { type: 'array', items: { type: 'object' } },
              path: {
                type: 'string',
                example: 'https://storage.com/public/1/a.webp',
              },
            },
          },
        },
      },
      example: [
        {
          transaction_id: 0,
          status: 'success',
          data: {
            id: 1,
            user_id: 1,
            type: 'public',
            name: 'a.webp',
            size: 102400,
            verified: true,
            created_at: '2026-03-30T12:00:00.000Z',
            updated_at: '2026-03-30T12:00:00.000Z',
            users: [],
            path: 'https://storage.com/public/1/a.webp',
          },
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
          data: {
            id: 1,
            user_id: 1,
            type: 'public',
            name: 'a.webp',
            size: 102400,
            verified: true,
            created_at: '2026-03-30T12:00:00.000Z',
            updated_at: '2026-03-30T12:00:00.000Z',
            users: [],
            path: 'https://storage.com/public/1/a.webp',
          },
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
  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard)
  @UseInterceptors(AuthenticationInterceptor)
  @BulkHttpStatusDecorator()
  async index(
    @AuthenticationDecorator() authentication: Authentication,
    @Body() dto: FilesUpdateDto[],
  ): Promise<BulkTransaction<FileUpdateInterface>[]> {
    return this.storageUpdateProvider.index(authentication, dto);
  }
}
