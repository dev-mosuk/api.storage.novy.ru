import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { StorageDeleteProvider } from '@/app/providers/delete';
import { FileDeleteService } from '@/app/services/delete';
import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('StorageDeleteProvider', () => {
  let provider: StorageDeleteProvider;

  const repository = {
    findOne: jest.fn(),
  };

  const deleteService = {
    assertCanDelete: jest.fn(),
    deleteEntity: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StorageDeleteProvider,
        { provide: getRepositoryToken(File), useValue: repository },
        { provide: FileDeleteService, useValue: deleteService },
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

    provider = moduleRef.get(StorageDeleteProvider);
  });

  it('успешно удаляет и возвращает success', async () => {
    repository.findOne.mockResolvedValue({
      id: 1,
      user_id: 7,
      type: FileType.PUBLIC,
      name: 'a.webp',
    } as File);
    deleteService.assertCanDelete.mockReturnValue(undefined);
    deleteService.deleteEntity.mockResolvedValue(undefined);

    const out = await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      [{ path: 'https://storage.test/public/1/a.webp' }],
    );

    expect(out[0].status).toBe(BulkTransactionStatus.SUCCESS);
    expect(deleteService.assertCanDelete).toHaveBeenCalled();
    expect(deleteService.deleteEntity).toHaveBeenCalled();
  });

  it('возвращает error при запрете удаления', async () => {
    repository.findOne.mockResolvedValue({
      id: 1,
      user_id: 7,
      type: FileType.PUBLIC,
      name: 'a.webp',
    } as File);
    deleteService.assertCanDelete.mockImplementation(() => {
      throw new ForbiddenException({
        user_id: 'Удалить файл может только автор',
      });
    });

    const out = await provider.index(
      { user: { id: 8, role: UserRole.CUSTOMER } },
      [{ path: 'https://storage.test/public/1/a.webp' }],
    );

    expect(out[0].status).toBe(BulkTransactionStatus.ERROR);
    if (out[0].status === BulkTransactionStatus.ERROR) {
      expect(out[0].errors?.user_id).toContain('только автор');
    }
  });
});
