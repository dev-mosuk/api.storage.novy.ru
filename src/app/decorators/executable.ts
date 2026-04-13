import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { FileExecutableInterceptor } from '@/app/interceptors/executable';

export const FILE_EXECUTABLE_KEY = 'file_executable';

/**
 * Decorator for preventing upload of executable files
 * @param dangerousExtensions Array of extensions considered dangerous
 */
export function FileExecutable(
  dangerousExtensions = [
    'exe',
    'bat',
    'cmd',
    'sh',
    'ps1',
    'vbs',
    'js',
    'jar',
    'com',
    'scr',
    'php',
    'asp',
    'aspx',
    'dll',
    'reg',
    'pif',
    'msi',
    'msp',
    'hta',
    'cpl',
    'wsf',
    'wsh',
  ],
) {
  return applyDecorators(
    SetMetadata(FILE_EXECUTABLE_KEY, dangerousExtensions),
    UseInterceptors(FileExecutableInterceptor),
  );
}
