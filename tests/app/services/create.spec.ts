import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { FileCreateService } from '@/app/services/create';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios from 'axios';
import { FastifyRequest } from 'fastify';
import { Repository } from 'typeorm';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockRejectedValue(new Error('ENOENT')),
  readdir: jest.fn().mockResolvedValue([]),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('FileCreateService', () => {
  let service: FileCreateService;

  const mockRepository = (): Repository<File> => {
    const manager = {
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_entity: unknown, data: unknown) => data),
    };

    return {
      save: jest.fn().mockImplementation(async (entity: Partial<File>) => ({
        ...entity,
        id: 42,
        verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      manager: manager as unknown as Repository<File>['manager'],
    } as unknown as Repository<File>;
  };

  beforeEach(async () => {
    jest.mocked(axios.get).mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FileCreateService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'SERVICE_URL' || key === 'STORAGE_URL'
                ? 'https://storage.test'
                : undefined,
          },
        },
      ],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(FileCreateService);
  });

  it('createFromUpload: неподдерживаемый Content-Type', async () => {
    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'text/plain' },
      body: {},
    } as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results).toHaveLength(1);
    expect(results[0].error).toContain('Неподдерживаемый Content-Type');
  });

  it('createFromUpload: application/json без body', async () => {
    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'application/json' },
      body: undefined,
    } as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results[0].error).toContain('не содержит данных');
  });

  it('createFromUpload: JSON — элемент без path', async () => {
    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'application/json' },
      body: [{ path: '' }],
    } as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results[0].error).toContain('Path файла не указан');
  });

  it('createFromUpload: JSON — успешный импорт по URL (не изображение)', async () => {
    jest.mocked(axios.get).mockResolvedValue({
      data: Buffer.from('plain text'),
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });

    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'application/json' },
      body: [
        {
          path: 'https://example.com/notes.txt',
          type: FileType.PUBLIC,
        },
      ],
    } as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results).toHaveLength(1);
    expect(results[0].error).toBeNull();
    expect(results[0].id).toBe(42);
    expect(results[0].path).toBe('https://storage.test/public/42/notes.txt');
    expect(repo.save).toHaveBeenCalled();
  });

  it('createFromUpload: JSON — ошибка скачивания (axios вернул null)', async () => {
    jest.mocked(axios.get).mockResolvedValue({
      data: Buffer.alloc(0),
      headers: {},
    });

    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'application/json' },
      body: [{ path: 'https://example.com/missing.bin' }],
    } as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results[0].error).toContain('Ошибка при скачивании');
  });

  it('createFromUpload: multipart — пустое тело', async () => {
    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'multipart/form-data; boundary=----x' },
      body: {},
    } as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results).toHaveLength(1);
    expect(results[0].error).toBeDefined();
  });

  it('createFromUpload: multipart — type[0] как { type: field, value } (attachFieldsToBody)', async () => {
    const repo = mockRepository();
    const request = {
      headers: { 'content-type': 'multipart/form-data; boundary=----x' },
      body: {
        'file[0]': {
          type: 'file',
          filename: 'note.txt',
          mimetype: 'text/plain',
          toBuffer: async () => Buffer.from('hello'),
        },
        'type[0]': {
          type: 'field',
          fieldname: 'type[0]',
          value: 'public',
        },
      },
    } as unknown as FastifyRequest;

    const results = await service.createFromUpload(repo, request, undefined);

    expect(results).toHaveLength(1);
    expect(results[0].error).toBeNull();
    expect(results[0].id).toBe(42);
  });
});
