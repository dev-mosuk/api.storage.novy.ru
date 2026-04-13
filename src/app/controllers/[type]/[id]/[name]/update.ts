import { FileUpdateDto } from '@/app/dtos/[type]/[id]/[name]/update';
import { File } from '@/app/entities/file/entity';
import { FileByPathUpdateProvider } from '@/app/providers/[type]/[id]/[name]/update';
import { AuthenticationDecorator } from '@/shared/microservices/auth/authentication/decorators/decorator';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthenticationGuard } from '@/shared/microservices/auth/authentication/guards/guard';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Файлы')
@Controller(':type')
export class FileUpdateController {
  constructor(
    private readonly fileByPathUpdateProvider: FileByPathUpdateProvider,
  ) {}

  @ApiOperation({
    summary: 'Обновить по path',
    description:
      'Те же поля, что в **`PATCH /`**. Менять может **автор**, **ADMIN** или **MICROSERVICE**.',
  })
  @ApiBearerAuth('JWT')
  @ApiBody({ type: FileUpdateDto })
  @ApiParam({
    name: 'type',
    enum: ['public', 'private'],
    example: 'public',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'name', example: 'photo.webp' })
  @ApiOkResponse({ description: 'Полный успех' })
  @ApiResponse({
    status: 400,
    description: 'Некорректный запрос',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        path: 'Укажите verified, user_id и/или users',
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
        user_id: 'Изменять файл может только автор',
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
  @Patch(':id/:name')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard)
  @UseInterceptors(AuthenticationInterceptor)
  async index(
    @AuthenticationDecorator() authentication: Authentication,
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('name') name: string,
    @Body() dto: FileUpdateDto,
  ): Promise<File> {
    return this.fileByPathUpdateProvider.index(
      authentication,
      type,
      id,
      name,
      dto,
    );
  }
}
