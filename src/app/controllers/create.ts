import { FileExecutable } from '@/app/decorators/executable';
import { FileSecurity } from '@/app/decorators/security';
import { FileSize } from '@/app/decorators/size';
import { FileResizeCreateDto } from '@/app/dtos/(resize)/create';
import { StorageCreateProvider } from '@/app/providers/create';
import { BulkHttpStatusDecorator } from '@/common/bulk/decorators/http/status/decorator';
import { AuthenticationDecorator } from '@/shared/microservices/auth/authentication/decorators/decorator';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

@ApiTags('Файлы')
@ApiExtraModels(FileResizeCreateDto)
@Controller()
export class FilesCreateController {
  constructor(private readonly storageCreateProvider: StorageCreateProvider) {}

  @ApiOperation({
    summary: 'Создать списком',
    description: [
      'Загрузка **multipart** или импорт по **JSON** с URL.',
      '',
      'Поля **`type`**, **quality**, **`resize`**, **`users`** — в теле рядом с каждым элементом.',
      '',
      'Опционально **`transaction_id`** (целое ≥0): correlation id клиента для сопоставления с ответом; без поля совпадает с индексом элемента. В multipart — **`transaction_id[n]`**.',
      '',
      '**JWT опционален** — с токеном подставляется `user_id`, без токена `user_id = null`.',
    ].join('\n'),
  })
  @ApiBearerAuth('JWT')
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    required: false,
    description:
      'JSON — массив с `path`. Multipart — `file[n]`, `type[n]`, опционально `transaction_id[n]` и т.д.',
    schema: {
      oneOf: [
        {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                format: 'uri',
                example: 'https://example.com/image.jpg',
              },
              type: {
                type: 'string',
                enum: ['public', 'private'],
                example: 'public',
              },
              quality: {
                type: 'number',
                example: 80,
              },
              resize: {
                type: 'object',
                example: {
                  width: 800,
                  height: 600,
                  fit: 'cover',
                  position: 'center',
                },
              },
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    user_id: { type: 'number', example: 7 },
                  },
                },
                example: [{ user_id: 7 }, { user_id: 11 }],
              },
              transaction_id: {
                type: 'integer',
                minimum: 0,
                example: 1,
              },
            },
            required: ['path'],
          },
        },
        {
          type: 'object',
          properties: {
            'file[0]': { type: 'string', format: 'binary' },
            'type[0]': { type: 'string', enum: ['public', 'private'] },
            'quality[0]': { type: 'number', example: 80 },
            'resize[0]': {
              type: 'string',
              example: '{"width":800,"height":600,"fit":"cover"}',
            },
            'users[0]': {
              type: 'string',
              example: '[{"user_id":7},{"user_id":11}]',
            },
            'transaction_id[0]': { type: 'integer', minimum: 0, example: 1 },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Полный успех',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transaction_id: { type: 'number', example: 0 },
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                example: 42,
              },
              user_id: {
                type: 'number',
                nullable: true,
                example: 1,
              },
              type: {
                type: 'string',
                example: 'public',
              },
              name: {
                type: 'string',
                example: 'image.webp',
              },
              size: {
                type: 'number',
                nullable: true,
                example: 102400,
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-30T12:00:00.000Z',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-30T12:00:00.000Z',
              },
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 10 },
                    file_id: { type: 'number', example: 42 },
                    user_id: { type: 'number', example: 7 },
                  },
                },
              },
              path: {
                type: 'string',
                example: 'https://storage.com/public/42/image.webp',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 207,
    description:
      'Частичный успех. В `errors` для JSON — ключ `path`, для multipart — `file`.',
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
            name: 'image.webp',
            size: 102400,
            created_at: '2026-03-30T12:00:00.000Z',
            updated_at: '2026-03-30T12:00:00.000Z',
            users: [],
            path: 'https://storage.com/public/1/image.webp',
          },
        },
        {
          transaction_id: 1,
          status: 'error',
          errors: {
            file: 'Не загружены файлы',
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      'Полная неудача. В `errors` для JSON — ключ `path`, для multipart — `file`.',
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
  @ApiInternalServerErrorResponse({ description: 'Ошибка сервера' })
  @Post()
  @HttpCode(HttpStatus.OK)
  @FileSize(10 * 1024 * 1024)
  @FileExecutable()
  @FileSecurity()
  @BulkHttpStatusDecorator()
  @UseInterceptors(AuthenticationInterceptor)
  async index(
    @AuthenticationDecorator() authentication: Authentication,
    @Req() request: FastifyRequest,
  ) {
    return this.storageCreateProvider.index(authentication, request);
  }
}
