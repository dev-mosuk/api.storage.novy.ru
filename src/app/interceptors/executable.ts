import { FILE_EXECUTABLE_KEY } from '@/app/decorators/executable';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as path from 'path';
import { Observable } from 'rxjs';

@Injectable()
export class FileExecutableInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const dangerousExtensions = this.reflector.getAllAndOverride<string[]>(
      FILE_EXECUTABLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!dangerousExtensions || dangerousExtensions.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Обработка в зависимости от типа запроса (multipart или json)
    if (request.headers['content-type']?.includes('multipart/form-data')) {
      return this.handleMultipartRequest(request, dangerousExtensions, next);
    } else {
      return this.handleJsonRequest(request, dangerousExtensions, next);
    }
  }

  private handleMultipartRequest(
    request: any,
    dangerousExtensions: string[],
    next: CallHandler,
  ): Observable<any> {
    const body = request.body;

    if (!body) {
      return next.handle();
    }

    // Извлекаем все файлы из запроса
    const filesFromBody = Object.keys(body).reduce((acc, key) => {
      const value = body[key];
      if (value && typeof value === 'object' && 'filename' in value) {
        acc.push(value);
      }

      return acc;
    }, [] as any[]);

    if (filesFromBody.length === 0) {
      return next.handle();
    }

    // Проверяем расширения файлов
    for (const file of filesFromBody) {
      const { filename } = file;
      const extension = path.extname(filename).slice(1).toLowerCase();

      if (dangerousExtensions.includes(extension)) {
        throw new BadRequestException(
          `Загрузка исполняемых файлов запрещена: "${filename}" имеет запрещенное расширение .${extension}`,
        );
      }
    }

    return next.handle();
  }

  private handleJsonRequest(
    request: any,
    dangerousExtensions: string[],
    next: CallHandler,
  ): Observable<any> {
    const body = request.body;

    // Для JSON запросов проверяем path файлов
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.path) {
          try {
            const url = new URL(item.path);
            const pathname = url.pathname;
            const extension = path.extname(pathname).slice(1).toLowerCase();

            if (dangerousExtensions.includes(extension)) {
              throw new BadRequestException(
                `Загрузка исполняемых файлов запрещена: "${pathname}" имеет запрещенное расширение .${extension}`,
              );
            }
          } catch (error) {
            if (error instanceof BadRequestException) {
              throw error;
            }
            // Если path некорректный, пропускаем проверку и оставляем обработку этой ошибки на провайдер
          }
        }
      }
    }

    return next.handle();
  }
}
