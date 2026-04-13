import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { FileSecurityInterceptor } from '@/app/interceptors/security';

export const FILE_SECURITY_KEY = 'file_security';

/**
 * Decorator for checking file security by examining content for suspicious patterns
 * @param suspiciousPatterns Array of patterns considered suspicious
 */
export function FileSecurity(
  suspiciousPatterns = [
    Buffer.from('4D5A', 'hex'), // MZ заголовок (EXE файлы)
    Buffer.from('#!/bin/sh', 'utf8'), // Шебанг скрипта shell
    Buffer.from('<%@', 'utf8'), // ASP теги
    Buffer.from('<?php', 'utf8'), // PHP теги
  ],
) {
  return applyDecorators(
    SetMetadata(FILE_SECURITY_KEY, suspiciousPatterns),
    UseInterceptors(FileSecurityInterceptor),
  );
}
