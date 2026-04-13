import { BulkHttpStatusInterceptor } from '@/common/bulk/interceptors/http/status/interceptor';
import { UseInterceptors, applyDecorators } from '@nestjs/common';

export function BulkHttpStatusDecorator() {
  return applyDecorators(UseInterceptors(BulkHttpStatusInterceptor));
}
