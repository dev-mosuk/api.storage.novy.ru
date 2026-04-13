import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { FILE_SIZE_KEY } from '@/app/decorators/size';

@Injectable()
export class FileSizeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const fileSizeLimit = this.reflector.getAllAndOverride<number>(
      FILE_SIZE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!fileSizeLimit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Обработка в зависимости от типа запроса (multipart или json)
    if (request.headers['content-type']?.includes('multipart/form-data')) {
      return this.handleMultipartRequest(request, fileSizeLimit, next);
    } else {
      return this.handleJsonRequest(request, fileSizeLimit, next);
    }
  }

  private handleMultipartRequest(
    request: any,
    fileSizeLimit: number,
    next: CallHandler,
  ): Observable<any> {
    const body = request.body;

    if (!body) {
      return next.handle();
    }

    const filesFromBody = Object.keys(body).reduce((acc, key) => {
      const value = body[key];
      if (
        value &&
        typeof value === 'object' &&
        'filename' in value &&
        value._buf instanceof Buffer
      ) {
        acc.push(value);
      }

      return acc;
    }, [] as any[]);

    if (filesFromBody.length === 0) {
      return next.handle();
    }

    for (const file of filesFromBody) {
      const { filename, _buf } = file;

      if (!_buf || !_buf.length) {
        throw new BadRequestException(
          `Не удалось определить размер файла: ${filename}`,
        );
      }

      const fileSize = _buf.length;

      if (fileSize > fileSizeLimit) {
        throw new BadRequestException(
          `Файл "${filename}" превышает допустимый размер ${fileSizeLimit / (1024 * 1024)} МБ`,
        );
      }
    }

    return next.handle();
  }

  private handleJsonRequest(
    request: any,
    fileSizeLimit: number,
    next: CallHandler,
  ): Observable<any> {
    // Для JSON запросов мы проверим размер в FilesCreateProvider,
    // так как нужно загрузить содержимое по URL
    return next.handle();
  }
}
