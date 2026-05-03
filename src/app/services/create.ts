import { FileCreateDto } from '@/app/dtos/create';
import { File } from '@/app/entities/file/entity';
import { FileUser } from '@/app/entities/file/users/entity';
import { FileResizeFit, FileResizePosition, FileType } from '@/app/enums/enum';
import { FileName } from '@/app/utilities/name/utility';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FastifyRequest } from 'fastify';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { Repository } from 'typeorm';

export interface ProcessedFileInterface {
  filename: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
}

export interface FileCreateResultInterface {
  id?: number | null;
  path?: string | null;
  name?: string | null;
  error?: string | null;
  /** Ключ поля в bulk `errors` (иначе провайдер подставляет `file` / `path`). */
  errorKey?: string;
  /** Correlation id из bulk-элемента; провайдер подставляет в ответ или индекс. */
  transaction_id?: number;
}

interface CreateItemOptionsInterface {
  type: FileType;
  user_id: number | null;
  quality?: number;
  resize?: FileCreateDto['resize'];
  users?: FileCreateDto['users'];
}

interface CreatePendingInterface {
  index: number;
  transaction_id?: number;
  file?: ProcessedFileInterface;
  options?: CreateItemOptionsInterface;
  error?: FileCreateResultInterface;
}

@Injectable()
export class FileCreateService implements OnModuleInit {
  private readonly logger = new Logger(FileCreateService.name);
  private readonly tempDir = path.join(process.cwd(), '/temp');

  basePath: string;

  private readonly imageExtensionToMime: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.basePath = this.configService.get<string>('SERVICE_URL');
    void this.ensureTempDirExists();
  }

  /**
   * Загрузка по HTTP: multipart (поле `file[n]`) или JSON с path (выбор по Content-Type).
   */
  async createFromUpload(
    repository: Repository<File>,
    request: FastifyRequest,
    authentication: Authentication | undefined,
  ): Promise<FileCreateResultInterface[]> {
    const contentType = request.headers['content-type'] || '';
    const jwt_user_id = authentication?.user?.id ?? null;

    if (contentType.includes('multipart/form-data')) {
      try {
        const pending = await this.extractMultipartItems(request, jwt_user_id);

        return this.createFromPending(repository, pending);
      } catch (error) {
        return [
          {
            path: null,
            name: 'upload',
            error: error.message,
            errorKey: 'file',
          },
        ];
      }
    }

    if (contentType.includes('application/json')) {
      const body = request.body as FileCreateDto[] | FileCreateDto | undefined;
      if (!body) {
        return [
          {
            path: null,
            name: null,
            error: 'Запрос не содержит данных о файлах',
            errorKey: 'path',
          },
        ];
      }

      return this.createFromJsonPaths(body, repository, jwt_user_id);
    }

    return [
      {
        path: null,
        name: null,
        error: `Неподдерживаемый Content-Type: ${contentType}`,
        errorKey: 'path',
      },
    ];
  }

  /** Сохранение уже подготовленных буферов (WebP, диск, БД). */
  async create(
    repository: Repository<File>,
    type: FileType,
    user_id: number | null,
    files: ProcessedFileInterface[],
    dto?: Omit<FileCreateDto, 'path'>,
  ): Promise<FileCreateResultInterface[]> {
    const quality = this.validateQuality(dto?.quality);
    const results: FileCreateResultInterface[] = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          const base = path.basename(file.filename);
          let storedName: string;

          let processedBuffer = file.buffer;
          let fileSize = file.buffer.length;

          if (this.isImageFile(file.mimetype)) {
            processedBuffer = await this.convertToWebp(
              file.buffer,
              quality,
              dto?.resize,
            );
            fileSize = processedBuffer.length;
            const parsed = path.parse(base);
            storedName = FileName(`${parsed.name}.webp`);
          } else {
            storedName = FileName(base);
          }

          const fileEntity = await repository.save({
            user_id: user_id,
            type,
            name: storedName,
            size: fileSize,
          });

          await this.saveUsersAccess(repository, fileEntity, dto?.users);

          const storageDir = path.join(
            process.cwd(),
            type,
            String(fileEntity.id),
          );
          await fs.mkdir(storageDir, { recursive: true });

          const filePath = path.join(storageDir, storedName);

          await fs.writeFile(filePath, processedBuffer);

          const responsePath = `${this.basePath}/${type}/${fileEntity.id}/${storedName}`;

          results.push({
            id: fileEntity.id,
            path: responsePath,
            name: storedName,
            error: null,
          });
        } catch (error) {
          results.push({
            id: null,
            path: null,
            name: file.filename,
            error: error.message,
            errorKey: 'file',
          });
        }
      }),
    );

    return results;
  }

  private async createFromPending(
    repository: Repository<File>,
    pending: CreatePendingInterface[],
  ): Promise<FileCreateResultInterface[]> {
    const results: FileCreateResultInterface[] = [];
    const successItems = pending.filter(
      (pendingItem) => pendingItem.file && pendingItem.options,
    ) as Required<Pick<CreatePendingInterface, 'file' | 'options'>>[];

    const serviceResults = await Promise.all(
      successItems.map((item) =>
        this.create(
          repository,
          item.options.type,
          item.options.user_id,
          [item.file],
          {
            quality: item.options.quality,
            resize: item.options.resize,
            users: item.options.users,
          },
        ),
      ),
    );

    let successIndex = 0;
    for (const pendingItem of pending) {
      const tid = pendingItem.transaction_id;
      if (pendingItem.error) {
        results.push({ ...pendingItem.error, transaction_id: tid });
      } else {
        const row = serviceResults[successIndex++][0];

        results.push({ ...row, transaction_id: tid });
      }
    }

    return results;
  }

  private async createFromJsonPaths(
    files: FileCreateDto[] | FileCreateDto,
    repository: Repository<File>,
    jwt_user_id: number | null,
  ): Promise<FileCreateResultInterface[]> {
    const filesArray = Array.isArray(files) ? files : [files];
    const pending: CreatePendingInterface[] = [];

    for (let index = 0; index < filesArray.length; index++) {
      const fileObj = filesArray[index];
      try {
        if (!fileObj.path) {
          pending.push({
            index,
            transaction_id: fileObj.transaction_id,
            error: {
              path: null,
              name: 'unknown',
              error: 'Path файла не указан',
              errorKey: 'path',
            },
          });
          continue;
        }

        const options = this.resolveItemOptions(fileObj, jwt_user_id);
        const result = await this.downloadFileByUrl(fileObj.path);
        if (!result) {
          pending.push({
            index,
            transaction_id: fileObj.transaction_id,
            error: {
              path: null,
              name: fileObj.path,
              error: 'Ошибка при скачивании файла',
              errorKey: 'path',
            },
          });
          continue;
        }

        pending.push({
          index,
          transaction_id: fileObj.transaction_id,
          options,
          file: {
            filename: result.fileName,
            encoding: 'binary',
            mimetype: result.mimeType,
            buffer: result.buffer,
          },
        });
      } catch (error) {
        pending.push({
          index,
          transaction_id: fileObj.transaction_id,
          error: {
            path: null,
            name: fileObj.path,
            error: error.message || 'Неизвестная ошибка при скачивании',
            errorKey: 'path',
          },
        });
      }
    }
    const results = await this.createFromPending(repository, pending);
    await this.cleanupTempFiles();

    return results;
  }

  private async extractMultipartItems(
    request: FastifyRequest,
    jwt_user_id: number | null,
  ): Promise<CreatePendingInterface[]> {
    const body = (await request.body) as Record<string, unknown>;
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('Не удалось получить данные из запроса');
    }

    const pendingMap = new Map<number, CreatePendingInterface>();
    const setItem = (index: number): CreatePendingInterface => {
      if (!pendingMap.has(index)) {
        pendingMap.set(index, { index });
      }

      return pendingMap.get(index)!;
    };

    for (const [key, value] of Object.entries(body)) {
      const match = key.match(/^([a-z_]+)(?:\[(\d+)\])?$/i);
      if (!match) {
        continue;
      }

      const field = match[1].toLowerCase();
      const index = Number(match[2] ?? '0');
      const item = setItem(index);

      if (field === 'file') {
        const fileCandidate = Array.isArray(value) ? value[0] : value;
        if (
          fileCandidate &&
          typeof fileCandidate === 'object' &&
          (fileCandidate as { type?: string }).type === 'file'
        ) {
          const fileObject = fileCandidate as {
            filename?: string;
            encoding?: string;
            mimetype?: string;
            toBuffer: () => Promise<Buffer>;
          };
          item.file = {
            filename: fileObject.filename ?? 'upload',
            encoding: fileObject.encoding || 'binary',
            mimetype: fileObject.mimetype ?? 'application/octet-stream',
            buffer: await fileObject.toBuffer(),
          };
        }
        continue;
      }

      const rawValue = Array.isArray(value) ? value[0] : value;

      if (field === 'transaction_id') {
        try {
          const txnId = this.parseMultipartBulkTransactionId(rawValue);
          if (txnId !== undefined) {
            item.transaction_id = txnId;
          }
        } catch (error) {
          item.error = {
            path: null,
            name: `transaction_id[${index}]`,
            error: error.message,
            errorKey: 'transaction_id',
          };
        }
        continue;
      }

      const options = item.options ?? {
        type: FileType.PUBLIC,
        user_id: jwt_user_id,
      };

      try {
        if (field === 'type' && rawValue !== undefined) {
          options.type = this.parseType(rawValue);
        }

        if (field === 'user_id' && rawValue !== undefined) {
          options.user_id = this.parseUserId(rawValue, jwt_user_id);
        }

        if (field === 'quality' && rawValue !== undefined) {
          options.quality = this.parseQuality(rawValue);
        }

        if (field === 'resize' && rawValue !== undefined) {
          options.resize = this.parseResize(rawValue);
        }

        if (field === 'users' && rawValue !== undefined) {
          options.users = this.parseUsers(rawValue);
        }
      } catch (error) {
        item.error = {
          path: null,
          name: `${field}[${index}]`,
          error: error.message,
          errorKey: field,
        };
      }

      item.options = options;
    }

    const pending = [...pendingMap.values()].sort((a, b) => a.index - b.index);
    if (pending.length === 0) {
      throw new BadRequestException('Не загружены файлы');
    }

    return pending.map((item) => {
      if (item.error) {
        return {
          index: item.index,
          transaction_id: item.transaction_id,
          error: item.error,
        };
      }

      if (!item.file) {
        return {
          index: item.index,
          transaction_id: item.transaction_id,
          error: {
            path: null,
            name: 'upload',
            error: 'Не загружены файлы',
            errorKey: 'file',
          },
        };
      }

      return {
        ...item,
        options: item.options ?? {
          type: FileType.PUBLIC,
          user_id: jwt_user_id,
        },
      };
    });
  }

  private resolveItemOptions(
    item: Partial<Omit<FileCreateDto, 'path'>>,
    jwt_user_id: number | null,
  ): CreateItemOptionsInterface {
    return {
      type: this.parseType(item.type),
      user_id: this.parseUserId(item.user_id, jwt_user_id),
      quality: this.parseQuality(item.quality),
      resize: this.parseResize(item.resize),
      users: this.parseUsers(item.users),
    };
  }

  private parseType(rawType: unknown): FileType {
    const normalized = this.normalizeMultipartScalar(rawType);
    if (normalized === undefined || normalized === '') {
      return FileType.PUBLIC;
    }

    if (normalized === FileType.PUBLIC || normalized === FileType.PRIVATE) {
      return normalized;
    }

    throw new Error('type должен быть public или private');
  }

  /**
   * @fastify/multipart с `attachFieldsToBody: true` отдаёт обычные поля как
   * `{ type: 'field', value: 'public', ... }`, а не строку — иначе `String(obj)` → `[object Object]`.
   */
  private unwrapMultipartFieldValue(value: unknown): unknown {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (value as { type?: string }).type === 'field' &&
      'value' in value
    ) {
      return (value as { value: unknown }).value;
    }

    return value;
  }

  /** Строки multipart часто приходят как Buffer; сравнение с enum иначе падает. */
  private normalizeMultipartScalar(value: unknown): string | undefined {
    const unwrapped = this.unwrapMultipartFieldValue(value);

    if (unwrapped === undefined || unwrapped === null) {
      return undefined;
    }

    if (typeof unwrapped === 'string') {
      return unwrapped.trim();
    }

    if (Buffer.isBuffer(unwrapped)) {
      return unwrapped.toString('utf8').trim();
    }

    return String(unwrapped).trim();
  }

  private parseUserId(
    rawUserId: unknown,
    jwt_user_id: number | null,
  ): number | null {
    void rawUserId;

    return jwt_user_id;
  }

  private parseQuality(rawQuality: unknown): number | undefined {
    if (rawQuality === undefined || rawQuality === null || rawQuality === '') {
      return undefined;
    }

    if (typeof rawQuality === 'number' && Number.isInteger(rawQuality)) {
      return rawQuality;
    }

    const text = this.normalizeMultipartScalar(rawQuality);
    if (text === undefined || text === '') {
      return undefined;
    }
    const quality = Number(text);
    if (!Number.isInteger(quality)) {
      throw new Error('quality должен быть целым числом');
    }

    return quality;
  }

  /** Неотрицательный int для bulk correlation id; без значения — undefined. */
  private parseMultipartBulkTransactionId(
    rawInput: unknown,
  ): number | undefined {
    const raw = this.unwrapMultipartFieldValue(rawInput);
    if (raw === undefined || raw === null || raw === '') {
      return undefined;
    }

    if (typeof raw === 'number' && Number.isInteger(raw)) {
      if (raw < 0) {
        throw new Error('transaction_id не может быть отрицательным');
      }

      return raw;
    }

    const text = this.normalizeMultipartScalar(rawInput);
    if (text === undefined || text === '') {
      return undefined;
    }

    const txn = Number(text);
    if (!Number.isInteger(txn)) {
      throw new Error('transaction_id должен быть целым числом');
    }

    if (txn < 0) {
      throw new Error('transaction_id не может быть отрицательным');
    }

    return txn;
  }

  private parseResize(rawResize: unknown): FileCreateDto['resize'] | undefined {
    const raw = this.unwrapMultipartFieldValue(rawResize);

    if (raw === undefined || raw === null || raw === '') {
      return undefined;
    }

    if (typeof raw === 'object' && raw !== null && !Buffer.isBuffer(raw)) {
      return raw as FileCreateDto['resize'];
    }

    const text = this.normalizeMultipartScalar(raw);

    if (text === undefined || text === '') {
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('resize должен быть валидным JSON');
    }
  }

  private parseUsers(rawUsers: unknown): FileCreateDto['users'] | undefined {
    if (rawUsers === undefined || rawUsers === null || rawUsers === '') {
      return undefined;
    }

    let value: unknown = this.unwrapMultipartFieldValue(rawUsers);

    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'string' || Buffer.isBuffer(value)) {
      const text = this.normalizeMultipartScalar(value) ?? '';
      try {
        value = JSON.parse(text);
      } catch {
        throw new Error('users должен быть валидным JSON-массивом');
      }
    }

    if (!Array.isArray(value)) {
      throw new Error('users должен быть массивом');
    }

    const users = value.map((item) => {
      const user_id =
        typeof item === 'number'
          ? item
          : (item as { user_id?: unknown })?.user_id;
      const normalized = Number(user_id);
      if (!Number.isInteger(normalized) || normalized <= 0) {
        throw new Error('users.user_id должен быть положительным целым числом');
      }

      return { user_id: normalized };
    });

    return users;
  }

  private async saveUsersAccess(
    repository: Repository<File>,
    fileEntity: File,
    users: FileCreateDto['users'],
  ): Promise<void> {
    if (users === undefined) {
      return;
    }

    await repository.manager.delete(FileUser, { file_id: fileEntity.id });
    const unique = [...new Set(users.map((user) => user.user_id))];
    for (const user_id of unique) {
      await repository.manager.save(
        FileUser,
        repository.manager.create(FileUser, {
          file_id: fileEntity.id,
          user_id,
        }),
      );
    }
  }

  private async downloadFileByUrl(fileUrl: string) {
    try {
      new URL(fileUrl);

      const response = await axios.get(fileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        responseType: 'arraybuffer',
      });

      const rawContentType = response.headers['content-type'];
      if (!rawContentType) {
        throw new Error('Не удалось определить тип контента');
      }

      const baseContentType = rawContentType.split(';')[0].trim().toLowerCase();

      const buffer = Buffer.from(response.data);

      const url = new URL(fileUrl);
      const urlParts = url.pathname.split('/');
      let fileName = urlParts.pop() || `file-${Date.now()}`;

      if (!path.extname(fileName)) {
        const ext = baseContentType.split('/')[1];
        if (ext) {
          fileName += `.${ext}`;
        }
      }

      const mimeType = this.resolveMimeTypeFromUrl(baseContentType, fileName);

      const filePath = path.join(this.tempDir, fileName);
      await fs.writeFile(filePath, buffer);

      return {
        filePath,
        fileName,
        mimeType,
        buffer,
      };
    } catch (error) {
      this.logger.error('Error downloading file:', error);

      return null;
    }
  }

  private resolveMimeTypeFromUrl(
    contentType: string,
    fileName: string,
  ): string {
    const genericTypes = [
      'application/octet-stream',
      'binary/octet-stream',
      'application/binary',
    ];

    if (!genericTypes.includes(contentType)) {
      return contentType;
    }

    const ext = path.extname(fileName).slice(1).toLowerCase();

    return this.imageExtensionToMime[ext] ?? contentType;
  }

  private async ensureTempDirExists() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);

      for (const file of files) {
        try {
          await fs.unlink(path.join(this.tempDir, file));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async convertToWebp(
    buffer: Buffer,
    quality: number,
    resize?: FileCreateDto['resize'],
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      if (resize) {
        const resizeOptions: Record<string, unknown> = {
          fit: resize.fit || FileResizeFit.COVER,
          position: resize.position || FileResizePosition.CENTER,
        };

        if (resize.fit === FileResizeFit.CONTAIN && resize.background) {
          resizeOptions.background = this.parseColor(resize.background);
        }

        pipeline = pipeline.resize(resize.width, resize.height, resizeOptions);
      }

      return await pipeline.webp({ quality }).toBuffer();
    } catch (error) {
      throw new Error(`Ошибка конвертации в WebP: ${error.message}`);
    }
  }

  private parseColor(color: string): {
    r: number;
    g: number;
    b: number;
    alpha: number;
  } {
    const defaultColor = { r: 255, g: 255, b: 255, alpha: 1 };

    try {
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16);
          const g = parseInt(hex[1] + hex[1], 16);
          const b = parseInt(hex[2] + hex[2], 16);

          return { r, g, b, alpha: 1 };
        } else if (hex.length === 6) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);

          return { r, g, b, alpha: 1 };
        }
      }

      return defaultColor;
    } catch {
      return defaultColor;
    }
  }

  private validateQuality(quality?: number): number {
    if (quality === undefined || quality === null) {
      return 80;
    }

    const normalizedQuality = Math.round(quality);

    if (normalizedQuality < 1 || normalizedQuality > 100) {
      return 100;
    }

    return normalizedQuality;
  }
}
