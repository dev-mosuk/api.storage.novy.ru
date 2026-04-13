import { FileSizeInterceptor } from '@/app/interceptors/size';
import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';

export const FILE_SIZE_KEY = 'file_size';

/**
 * Decorator for validating file size in bytes
 * @param maxSizeBytes Maximum allowed file size in bytes (default: 5MB)
 */
export function FileSize(maxSizeBytes = 5 * 1024 * 1024) {
  return applyDecorators(
    SetMetadata(FILE_SIZE_KEY, maxSizeBytes),
    UseInterceptors(FileSizeInterceptor),
  );
}
