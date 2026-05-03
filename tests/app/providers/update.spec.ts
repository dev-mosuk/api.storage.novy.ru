import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { StorageUpdateProvider } from '@/app/providers/update';
import { FileUpdateService } from '@/app/services/update';
import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('StorageUpdateProvider', () => {
  let provider: StorageUpdateProvider;
  const file = {
    id: 1,
    user_id: 7,
    type: FileType.PUBLIC,
    name: 'a.webp',
    size: 12,
    verified: false,
    created_at: new Date(),
    updated_at: new Date(),
    users: [],
  } as File;

  const manager = {
    findOne: jest.fn(),
    transaction: jest.fn(),
  };

  const repository = {
    manager,
  };

  const updateService = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    manager.transaction.mockImplementation(async (cb: any) => cb(manager));

    const moduleRef = await Test.createTestingModule({
      providers: [
        StorageUpdateProvider,
        { provide: getRepositoryToken(File), useValue: repository },
        {
          provide: FileUpdateService,
          useValue: updateService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'SERVICE_URL' ? 'https://storage.test' : undefined,
            ),
          },
        },
      ],
    }).compile();

    provider = moduleRef.get(StorageUpdateProvider);
  });

  it('возвращает success и вызывает updateService', async () => {
    manager.findOne.mockResolvedValue(file);
    updateService.update.mockResolvedValue({ ...file, verified: true });

    const out = await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      [{ path: 'https://storage.test/public/1/a.webp', verified: true }],
    );

    expect(out[0].status).toBe(BulkTransactionStatus.SUCCESS);
    expect(updateService.update).toHaveBeenCalled();
  });

  it('маппит ошибку not found в bulk error', async () => {
    manager.findOne.mockResolvedValue(null);

    const out = await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      [{ path: 'https://storage.test/public/1/a.webp', verified: true }],
    );

    expect(out[0].status).toBe(BulkTransactionStatus.ERROR);
    if (out[0].status === BulkTransactionStatus.ERROR) {
      expect(out[0].errors?.path).toContain('не найден');
    }
  });

  it('возвращает переданный transaction_id на элемент массива', async () => {
    manager.findOne.mockResolvedValue(file);
    updateService.update.mockResolvedValue({ ...file, verified: true });

    const out = await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      [
        {
          path: 'https://storage.test/public/1/a.webp',
          verified: true,
          transaction_id: 404,
        },
      ],
    );

    expect(out[0].status).toBe(BulkTransactionStatus.SUCCESS);
    expect(out[0].transaction_id).toBe(404);
  });

  it('без transaction_id подставляет индекс элемента', async () => {
    manager.findOne.mockResolvedValue(file);
    updateService.update.mockResolvedValue({ ...file, verified: true });

    const out = await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      [
        { path: 'https://storage.test/public/1/a.webp', verified: true },
        { path: 'https://storage.test/public/1/a.webp', verified: false },
      ],
    );

    expect(out[1].transaction_id).toBe(1);
  });

  it('маппит запрет на изменение чужого файла в bulk error', async () => {
    manager.findOne.mockResolvedValue(file);
    updateService.update.mockImplementation(() => {
      throw new ForbiddenException({
        user_id: 'Изменять файл может только автор',
      });
    });

    const out = await provider.index(
      { user: { id: 22, role: UserRole.CUSTOMER } },
      [{ path: 'https://storage.test/public/1/a.webp', user_id: 22 }],
    );

    expect(out[0].status).toBe(BulkTransactionStatus.ERROR);
    if (out[0].status === BulkTransactionStatus.ERROR) {
      expect(out[0].errors?.user_id).toContain('только автор');
    }
  });
});
