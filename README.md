# api.storage.mosuk.ru

REST API для загрузки, чтения, обновления и удаления файлов в зонах `public` и `private`.

## О сервисе

Сервис хранит метаданные файлов в MySQL и физические файлы на диске по структуре `/{type}/{id}/{name}`.

### Доступ

- **Чтение** (`GET /{type}/{id}/{name}`) - `public` доступен без JWT, `private` требует JWT и право доступа.
- **Запись** (`POST`, `PATCH`, `DELETE`) - требует JWT; часть операций ограничена ролью **ADMIN**.

### Авторизация

Токен JWT выдается сервисом [api.auth.mosuk.ru](https://api.auth.mosuk.ru) и передается в заголовке `Authorization: Bearer <JWT>`.

## Запуск

```bash
npm install
npm run start:dev
```

Прод:

```bash
npm run build && npm run start:prod
```

## Тесты

Юнит-тесты лежат в каталоге `tests/` и повторяют структуру `src/app/`: провайдеры (`providers/`), сервисы (`services/`), для маршрутов по сегментам пути — вложенность `providers/[type]/[id]/[name]/` (как в исходниках).

```text
tests/app
├── providers
│   ├── create.spec.ts
│   ├── delete.spec.ts
│   ├── update.spec.ts
│   └── [type]/[id]/[name]
│       ├── delete.spec.ts
│       └── update.spec.ts
└── services
    ├── create.spec.ts
    ├── delete.spec.ts
    └── update.spec.ts
```

Импорты в тестах используют тот же алиас `@/`, что и приложение (см. `package.json` → `jest.moduleNameMapper`).

```bash
npm test          # один прогон
npm run test:watch
npm run test:cov  # покрытие по src/
```

## Переменные окружения

```env
APP_SECRET_KEY=

SERVICE_NAME=
SERVICE_URL=
SERVICE_PORT=4010

SERVICE_DB_NAME=
SERVICE_DB_USER=
SERVICE_DB_PASSWORD=

STORAGE_URL=
SERVICE_WHITELIST_IPS=
```

## Файлы

Группа объединяет массовые операции (`POST /`, `PATCH /`, `DELETE /`) и операции по сегментам пути (`GET|PATCH|DELETE /{type}/{id}/{name}`).

**Особенности**

- Файлы сохраняются по структуре диска `/{type}/{id}/{name}`.
- Массовые операции возвращают `BulkTransaction[]`.
- При частичной обработке используется HTTP `207`.
- Для `private` чтение и удаление учитывают владельца, роль admin и список `users`.

```text
Файлы
├── Создать списком [POST] -> /
├── Обновить списком [PATCH] -> /
├── Удалить списком [DELETE] -> /
├── Получить по type, id, name [GET] -> /{type}/{id}/{name}
├── Обновить по type, id, name [PATCH] -> /{type}/{id}/{name}
└── Удалить по type, id, name [DELETE] -> /{type}/{id}/{name}
```

## Навигация эндпоинтов

Файлы

Создать списком [POST]  
Обновить списком [PATCH]  
Удалить списком [DELETE]

Получить по type, id, name [GET]  
Обновить по type, id, name [PATCH]  
Удалить по type, id, name [DELETE]

## Эндпоинты

### Создать списком [POST `/`]

Метод создает один или несколько файлов за запрос через `multipart/form-data` или через JSON-массив URL. Используется для пользовательской загрузки и серверного импорта файлов.

- Требуется JWT.
- Query: `type`, `quality`, `resize`, `user_id`.
- `user_id` применяется только для **ADMIN**; иначе берется `user_id` из JWT.

### Обновить списком [PATCH `/`]

Метод обновляет метаданные файлов по полному `path` в формате URL из ответа загрузки. Удобен для пакетных правок статуса `verified`, владельца `user_id` и списка доступа `users`.

- Требуется JWT.
- Тело - массив объектов `FilesUpdateDto`.
- Для каждого элемента возвращается `success` или `error`.

### Удалить списком [DELETE `/`]

Метод удаляет файлы пакетно по полному `path` и возвращает результат по каждому элементу. Используется для массовой очистки файлового хранилища.

- Требуется JWT и роль **ADMIN**.
- Тело - массив `FileDeleteDto` с полем `path`.

### Получить по type, id, name [GET `/{type}/{id}/{name}`]

Метод возвращает бинарное содержимое файла по сегментам пути. Для `public` доступ открыт, для `private` проверяется авторизация и право доступа.

- `type`: `public` или `private`.
- Для `private` доступ имеют владелец, admin или пользователь из `users`.

### Обновить по type, id, name [PATCH `/{type}/{id}/{name}`]

Метод обновляет один файл по сегментам пути. Используется, когда известны `type`, `id`, `name` и нужна точечная правка метаданных.

- Требуется JWT.
- Разрешено владельцу или admin.
- Тело - `FileUpdateDto`.

### Удалить по type, id, name [DELETE `/{type}/{id}/{name}`]

Метод удаляет один файл с диска и из БД по сегментам пути. Используется для адресного удаления без формирования массового списка.

- Требуется JWT.
- `public`: владелец или admin.
- `private`: владелец, admin или пользователь из `users`.

## Примеры запросов

### JSON upload

```bash
curl -X POST "https://api.storage.mosuk.ru/?type=private&user_id=42&quality=85" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '[
    { "url": "https://example.com/images/photo-1.jpg" },
    { "url": "https://example.com/files/report.pdf" }
  ]'
```

### Multipart upload

```bash
curl -X POST "https://api.storage.mosuk.ru/?type=public&quality=80&resize={\"width\":1200,\"height\":800,\"fit\":\"cover\"}" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@/absolute/path/to/photo.jpg" \
  -F "file=@/absolute/path/to/doc.pdf"
```

## Ошибки и статусы

- `200` - полный успех.
- `207` - частичный успех в bulk-операциях.
- `400` - полная неудача.
- `401` - нет JWT или токен невалиден.
- `403` - недостаточно прав.
- `404` - файл не найден.
- `500` - внутренняя ошибка сервиса.
