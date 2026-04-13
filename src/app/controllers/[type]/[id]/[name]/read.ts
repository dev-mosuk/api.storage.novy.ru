import { FileCreateInterface } from '@/app/interfaces/create';
import { FileByPathReadProvider } from '@/app/providers/[type]/[id]/[name]/read';
import { AuthenticationDecorator } from '@/shared/microservices/auth/authentication/decorators/decorator';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  StreamableFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

@ApiTags('Файлы')
@Controller(':type')
export class FileReadController {
  constructor(
    private readonly fileByPathReadProvider: FileByPathReadProvider,
  ) {}

  @ApiOperation({
    summary: 'Получить по path',
    description: [
      'Для **public** JWT не обязателен. Для **private** нужен JWT и доступ (автор, **ADMIN** или **`users`**).',
      '',
      'Тело запроса не передаётся.',
      '',
      'Ответ **200**: при заголовке `Accept: application/json` - JSON с метаданными и полем **path**; иначе - бинарное тело файла (`application/octet-stream`).',
    ].join('\n'),
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'type',
    enum: ['public', 'private'],
    example: 'public',
    description: 'Зона хранения',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({
    name: 'name',
    example: 'photo.webp',
    description: 'Имя файла (при необходимости URL-encoded)',
  })
  @ApiProduces('application/json', 'application/octet-stream')
  @ApiOkResponse({ description: 'Успех' })
  @ApiResponse({
    status: 400,
    description: 'Некорректный запрос',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        type: 'Тип зоны должен быть public или private',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        user_id: 'Недостаточно прав для чтения файла',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Не найдено',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        path: 'Файл не найден',
      },
    },
  })
  @ApiInternalServerErrorResponse({ description: 'Ошибка сервера' })
  @Get(':id/:name')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthenticationInterceptor)
  async index(
    @AuthenticationDecorator() authentication: Authentication | undefined,
    @Req() request: FastifyRequest,
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('name') name: string,
  ): Promise<FileCreateInterface | StreamableFile> {
    const accept = request.headers.accept;

    return this.fileByPathReadProvider.index(
      authentication,
      type,
      id,
      name,
      accept,
    );
  }
}
