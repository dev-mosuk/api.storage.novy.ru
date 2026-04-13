import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';
import { BulkTransaction } from '@/common/bulk/interfaces/transaction/create';

@Injectable()
export class BulkHttpStatusInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap((data: unknown) => {
        if (!Array.isArray(data) || !isBulkTransactionArray(data)) {
          return;
        }

        const reply = context.switchToHttp().getResponse<FastifyReply>();

        reply.status(resolveHttpStatus(data));
      }),
    );
  }
}

function isBulkTransactionArray(
  data: unknown[],
): data is BulkTransaction<unknown>[] {
  return data.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      'status' in item &&
      (item.status === BulkTransactionStatus.SUCCESS ||
        item.status === BulkTransactionStatus.ERROR),
  );
}

function resolveHttpStatus(items: BulkTransaction<unknown>[]): HttpStatus {
  const hasErrors = items.some(
    (item) => item.status === BulkTransactionStatus.ERROR,
  );
  const hasSuccess = items.some(
    (item) => item.status === BulkTransactionStatus.SUCCESS,
  );

  if (hasErrors && !hasSuccess) {
    return HttpStatus.BAD_REQUEST;
  }

  if (hasErrors && hasSuccess) {
    return HttpStatus.MULTI_STATUS;
  }

  return HttpStatus.OK;
}
