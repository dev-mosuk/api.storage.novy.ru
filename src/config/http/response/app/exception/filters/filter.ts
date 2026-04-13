import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AppResponseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppResponseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    reply.header('X-Request-Id', request.requestId);

    const { status, body } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${(body as Record<string, unknown>)?.message ?? 'Internal error'}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${JSON.stringify(body)}`,
      );
    }

    reply.status(status).send(body);
  }

  private resolve(exception: unknown): {
    status: number;
    body: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { status, body: { message: response } };
      }

      if (typeof response === 'object' && response !== null) {
        const raw = response as Record<string, unknown>;

        // Если есть message и больше ничего значимого - стандартная ошибка NestJS
        // Если есть поля кроме message/error/statusCode - возвращаем как объект ошибок
        const { message, error, statusCode, ...fields } = raw;

        if (Object.keys(fields).length > 0) {
          return { status, body: fields };
        }

        return {
          status,
          body: { message: message ?? error ?? 'Ошибка' },
        };
      }
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'Внутренняя ошибка сервиса' },
    };
  }
}
