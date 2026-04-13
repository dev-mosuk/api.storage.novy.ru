import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { FileByPathUpdateProvider } from '@/app/providers/[type]/[id]/[name]/update';
import { FileUpdateService } from '@/app/services/update';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FileByPathUpdateProvider', () => {
  let provider: FileByPathUpdateProvider;
  const manager = {
    findOne: jest.fn(),
    transaction: jest.fn(),
  };
  const repository = { manager };
  const updateService = { update: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    manager.transaction.mockImplementation(async (cb: any) => cb(manager));

    const moduleRef = await Test.createTestingModule({
      providers: [
        FileByPathUpdateProvider,
        { provide: getRepositoryToken(File), useValue: repository },
        { provide: FileUpdateService, useValue: updateService },
      ],
    }).compile();

    provider = moduleRef.get(FileByPathUpdateProvider);
  });

  it('декодирует name и делегирует обновление в сервис', async () => {
    const file = {
      id: 1,
      user_id: 7,
      type: FileType.PUBLIC,
      name: 'a b.webp',
      users: [],
    } as File;
    manager.findOne.mockResolvedValue(file);
    updateService.update.mockResolvedValue(file);

    await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      'public',
      1,
      'a%20b.webp',
      { verified: true },
    );

    expect(updateService.update).toHaveBeenCalled();
  });

  it('кидает NotFoundException если файл не найден', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      provider.index(
        { user: { id: 7, role: UserRole.CUSTOMER } },
        'public',
        1,
        'x.webp',
        { verified: true },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('пробрасывает ForbiddenException если не автор пытается обновить чужой файл', async () => {
    manager.findOne.mockResolvedValue({
      id: 1,
      user_id: 7,
      type: FileType.PRIVATE,
      name: 'x.webp',
      users: [{ id: 5, file_id: 1, user_id: 22 } as any],
    } as File);
    updateService.update.mockImplementation(() => {
      throw new ForbiddenException({
        user_id: 'Изменять файл может только автор',
      });
    });

    await expect(
      provider.index(
        { user: { id: 22, role: UserRole.CUSTOMER } }, // читатель, не автор
        'private',
        1,
        'x.webp',
        { user_id: 22, users: [{ user_id: 22 }] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
