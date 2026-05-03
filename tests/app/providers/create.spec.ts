import { StorageCreateProvider } from '@/app/providers/create';
import { FileCreateService } from '@/app/services/create';
import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FastifyRequest } from 'fastify';
import { Repository } from 'typeorm';

describe('StorageCreateProvider', () => {
  let provider: StorageCreateProvider;
  let fileRepository: jest.Mocked<Pick<Repository<File>, 'findOne'>>;
  let fileCreateService: jest.Mocked<
    Pick<FileCreateService, 'createFromUpload'>
  >;

  const mockFile = (overrides: Partial<File> = {}): File =>
    ({
      id: 1,
      user_id: null,
      type: FileType.PUBLIC,
      name: 'photo.webp',
      size: 1024,
      verified: false,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      users: [],
      ...overrides,
    }) as File;

  beforeEach(async () => {
    fileRepository = {
      findOne: jest.fn(),
    };

    fileCreateService = {
      createFromUpload: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StorageCreateProvider,
        {
          provide: getRepositoryToken(File),
          useValue: fileRepository,
        },
        {
          provide: FileCreateService,
          useValue: fileCreateService,
        },
      ],
    }).compile();

    provider = moduleRef.get(StorageCreateProvider);
  });

  it('возвращает success с data и path при успешной загрузке', async () => {
    const file = mockFile();
    fileCreateService.createFromUpload.mockResolvedValue([
      {
        id: 1,
        path: 'https://storage.test/public/1/photo.webp',
        name: 'photo.webp',
        error: null,
      },
    ]);
    fileRepository.findOne.mockResolvedValue(file);

    const req = {
      headers: {},
      body: {},
    } as FastifyRequest;

    const out = await provider.index(undefined, req);

    expect(out).toHaveLength(1);
    expect(out[0].status).toBe(BulkTransactionStatus.SUCCESS);
    expect(out[0].transaction_id).toBe(0);
    if (out[0].status === BulkTransactionStatus.SUCCESS) {
      expect(out[0].data).toMatchObject({
        id: 1,
        type: FileType.PUBLIC,
        name: 'photo.webp',
        path: 'https://storage.test/public/1/photo.webp',
      });
    }
  });

  it('переносит transaction_id из результата сервиса в bulk-ответ', async () => {
    const file = mockFile();
    fileCreateService.createFromUpload.mockResolvedValue([
      {
        id: 1,
        path: 'https://storage.test/public/1/photo.webp',
        name: 'photo.webp',
        error: null,
        transaction_id: 991,
      },
    ]);
    fileRepository.findOne.mockResolvedValue(file);

    const out = await provider.index(undefined, {
      headers: {},
      body: {},
    } as FastifyRequest);

    expect(out[0].transaction_id).toBe(991);
    expect(out[0].status).toBe(BulkTransactionStatus.SUCCESS);
  });

  it('маппит ошибку сервиса в errors.path', async () => {
    fileCreateService.createFromUpload.mockResolvedValue([
      {
        id: null,
        path: null,
        name: null,
        error: 'Не загружены файлы',
      },
    ]);

    const out = await provider.index(undefined, {
      headers: {},
      body: {},
    } as FastifyRequest);

    expect(out[0].status).toBe(BulkTransactionStatus.ERROR);
    if (out[0].status === BulkTransactionStatus.ERROR) {
      expect(out[0].errors).toEqual({
        path: 'Не загружены файлы',
      });
    }
  });

  it('ошибка, если после сохранения файл не найден в БД', async () => {
    fileCreateService.createFromUpload.mockResolvedValue([
      {
        id: 99,
        path: 'https://storage.test/public/99/x.webp',
        name: 'x.webp',
        error: null,
      },
    ]);
    fileRepository.findOne.mockResolvedValue(null);

    const out = await provider.index(undefined, {
      headers: {},
      body: {},
    } as FastifyRequest);

    expect(out[0].status).toBe(BulkTransactionStatus.ERROR);
    if (out[0].status === BulkTransactionStatus.ERROR) {
      expect(out[0].errors?.path).toContain('сохраненный файл');
    }
  });

  it('пробрасывает authentication в сервис', async () => {
    fileCreateService.createFromUpload.mockResolvedValue([]);
    const auth = { user: { id: 7 } } as Authentication;

    await provider.index(auth, {
      headers: { 'content-type': 'application/json' },
      body: [],
    } as FastifyRequest);

    expect(fileCreateService.createFromUpload).toHaveBeenCalledWith(
      fileRepository,
      expect.any(Object),
      auth,
    );
  });
});
