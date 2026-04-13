import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { FILE_SECURITY_KEY } from '@/app/decorators/security';

@Injectable()
export class FileSecurityInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const suspiciousPatterns = this.reflector.getAllAndOverride<Buffer[]>(
      FILE_SECURITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!suspiciousPatterns || suspiciousPatterns.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Поскольку проверка на вирусы требует проверки содержимого,
    // для multipart мы можем сделать это здесь, но для JSON нам нужно
    // будет сделать это в провайдере после загрузки файлов
    if (request.headers['content-type']?.includes('multipart/form-data')) {
      return this.handleMultipartRequest(request, suspiciousPatterns, next);
    } else {
      // Для JSON проверка будет происходить в FilesCreateProvider
      return next.handle();
    }
  }

  private handleMultipartRequest(
    request: any,
    suspiciousPatterns: Buffer[],
    next: CallHandler,
  ): Observable<any> {
    const body = request.body;

    if (!body) {
      return next.handle();
    }

    // Извлекаем все файлы с буферами из запроса
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

    // Проверяем содержимое файлов на подозрительные паттерны
    for (const file of filesFromBody) {
      const { filename, _buf, mimetype } = file;

      if (_buf) {
        // Пропускаем проверки для изображений по mimetype
        if (mimetype && mimetype.startsWith('image/')) {
          continue;
        }

        for (const pattern of suspiciousPatterns) {
          if (this.bufferContains(_buf, pattern)) {
            throw new BadRequestException(
              `Файл "${filename}" содержит подозрительное содержимое и может быть вредоносным`,
            );
          }
        }
      }
    }

    return next.handle();
  }

  // Проверка на наличие паттерна в буфере
  private bufferContains(buffer: Buffer, pattern: Buffer): boolean {
    if (pattern.length === 0) {
      return false;
    }

    if (pattern.length > buffer.length) {
      return false;
    }

    // Проверяем только начало файла (первые 4KB) для повышения производительности
    const checkSize = Math.min(buffer.length, 4096);

    // Простой поиск подстроки в буфере, ограниченный началом файла
    for (let i = 0; i <= checkSize - pattern.length; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) {
          found = false;
          break;
        }
      }

      if (found) {
        return true;
      }
    }

    return false;
  }
}
