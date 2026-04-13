import { AppModule } from '@/app/module';
import { docsConfig } from '@/config/docs/config';
import { multipartConfig } from '@/config/http/request/multipart/config';
import { validationConfig } from '@/config/http/request/validation/config';
import { AppResponseExceptionFilter } from '@/config/http/response/app/exception/filters/filter';
import { AppResponseInterceptor } from '@/config/http/response/app/interceptors/interceptor';
import { logsConfig } from '@/config/logs/config';
import { fastifyConfig } from '@/config/server/config';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
  const logger = logsConfig();
  const fastify = await fastifyConfig(logger);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastify,
    {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    },
  );

  await multipartConfig(app);

  docsConfig(app);

  app.useLogger(logger);

  app.useGlobalPipes(validationConfig());
  app.useGlobalInterceptors(new AppResponseInterceptor());
  app.useGlobalFilters(new AppResponseExceptionFilter());

  await app.listen(process.env.SERVICE_PORT || '3000', '0.0.0.0');
}

bootstrap();
