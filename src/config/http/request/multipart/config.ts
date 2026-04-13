import { NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

export async function multipartConfig(
  app: NestFastifyApplication,
): Promise<void> {
  await app.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 1024,
    },
    attachFieldsToBody: true,
    throwFileSizeLimit: true,
  });
}
