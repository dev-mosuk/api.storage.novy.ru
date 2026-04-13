import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

const apiName = process.env.SERVICE_NAME ?? 'api.storage.novy.ru';

export function docsConfig(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setVersion('1.0')
    .setTitle(apiName)
    .setDescription(
      [
        '## О сервисе',
        '',
        'REST API **файлового хранилища** для инфраструктуры [novy.ru](https://novy.ru): загрузка (`POST /`), чтение и изменение по пути `/{type}/{id}/{name}`, массовые **`PATCH /`** и **`DELETE /`** по полному URL файла (`path`).',
        '',
        '### Доступ',
        '',
        '- **Чтение** (`GET /{type}/{id}/{name}`) - для `public` JWT не обязателен; для `private` нужен JWT и доступ (владелец, **ADMIN** или список **`users`**).',
        '- **Загрузка** (`POST /`) - JWT **опционален**; с токеном в запросе подставляется `user_id`.',
        '- **Изменение и удаление** (`PATCH`, `DELETE`) - **JWT**; менять и удалять могут **автор файла**, **ADMIN** или **MICROSERVICE** (детали - в описании эндпоинта).',
        '',
        '### Авторизация',
        '',
        'Токен выдаётся через **[api.auth.novy.ru](https://api.auth.novy.ru)**. Заголовок: `Authorization: Bearer <JWT>`.',
      ].join('\n'),
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT',
    )
    .addTag(
      'Файлы',
      [
        'Один тег **Файлы** - все методы работы с файлами. Сводка по группам:',
        '',
        '**Массовые** (тело - массив; при частичных ошибках возможен HTTP **207**):',
        '',
        '- **`POST /`** - загрузка (multipart или JSON с URL).',
        '- **`PATCH /`** - обновление метаданных по полному `path` файла.',
        '- **`DELETE /`** - удаление по полному `path`.',
        '',
        '**По пути** `/{type}/{id}/{name}`:',
        '',
        '- **`GET`** - скачать файл или метаданные (см. `Accept`).',
        '- **`PATCH`** - обновить метаданные.',
        '- **`DELETE`** - удалить файл.',
      ].join('\n'),
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const handler = apiReference({
    metaData: {
      title: apiName,
    },
    favicon: '/public/static/logo/logo-256x256.ico',
    authentication: {
      preferredSecurityScheme: 'JWT',
    },
    content: document,
    layout: 'modern',
    theme: 'default',
    withFastify: true,
    showSidebar: true,
    hideModels: true,
    customCss: `
  .light-mode {
    --scalar-color-accent: #0077ed;
  }
  .dark-mode {
    --scalar-color-accent: #4da3ff;
  }
`,
  });
  const fastify = app.getHttpAdapter().getInstance();

  fastify.get('/', async (req, reply) => {
    (handler as (req: unknown, res: NodeJS.WritableStream) => void)(
      req.raw,
      reply.raw,
    );
  });
}
