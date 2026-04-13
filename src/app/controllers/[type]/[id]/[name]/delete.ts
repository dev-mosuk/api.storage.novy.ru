import { FileByPathDeleteProvider } from '@/app/providers/[type]/[id]/[name]/delete';
import { AuthenticationDecorator } from '@/shared/microservices/auth/authentication/decorators/decorator';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthenticationGuard } from '@/shared/microservices/auth/authentication/guards/guard';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Файлы')
@Controller(':type')
export class FileDeleteController {
  constructor(
    private readonly fileByPathDeleteProvider: FileByPathDeleteProvider,
  ) {}

  @ApiOperation({
    summary: 'Удалить по path',
    description: [
      'Удалить может **автор**, **ADMIN** или **MICROSERVICE**.',
      '',
      'Тело запроса не передаётся.',
    ].join('\n'),
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'type',
    enum: ['public', 'private'],
    example: 'public',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'name', example: 'photo.webp' })
  @ApiResponse({ status: 204, description: 'Успех' })
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
    status: 401,
    description: 'Нужен валидный JWT',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      example: {
        message: 'Необходимо авторизоваться',
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
        user_id: 'Удалить файл может только автор',
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
  @Delete(':id/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(AuthenticationInterceptor)
  @UseGuards(AuthenticationGuard)
  async index(
    @AuthenticationDecorator() authentication: Authentication,
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('name') name: string,
  ): Promise<void> {
    await this.fileByPathDeleteProvider.index(authentication, type, id, name);
  }
}
