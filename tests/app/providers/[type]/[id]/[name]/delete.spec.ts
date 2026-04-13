import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { FileByPathDeleteProvider } from '@/app/providers/[type]/[id]/[name]/delete';
import { FileDeleteService } from '@/app/services/delete';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FileByPathDeleteProvider', () => {
  let provider: FileByPathDeleteProvider;
  const repository = { findOne: jest.fn() };
  const deleteService = {
    assertCanDelete: jest.fn(),
    deleteEntity: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FileByPathDeleteProvider,
        { provide: getRepositoryToken(File), useValue: repository },
        { provide: FileDeleteService, useValue: deleteService },
      ],
    }).compile();

    provider = moduleRef.get(FileByPathDeleteProvider);
  });

  it('делегирует проверку прав и удаление в сервис', async () => {
    repository.findOne.mockResolvedValue({
      id: 1,
      user_id: 7,
      type: FileType.PRIVATE,
      name: 'x.webp',
      users: [],
    } as File);
    deleteService.assertCanDelete.mockReturnValue(undefined);
    deleteService.deleteEntity.mockResolvedValue(undefined);

    await provider.index(
      { user: { id: 7, role: UserRole.CUSTOMER } },
      'private',
      1,
      'x.webp',
    );

    expect(deleteService.assertCanDelete).toHaveBeenCalled();
    expect(deleteService.deleteEntity).toHaveBeenCalled();
  });

  it('кидает NotFoundException если файл не найден', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      provider.index(
        { user: { id: 7, role: UserRole.CUSTOMER } },
        'private',
        1,
        'x.webp',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('пробрасывает ForbiddenException если читатель пытается удалить чужой private-файл', async () => {
    repository.findOne.mockResolvedValue({
      id: 1,
      user_id: 7,
      type: FileType.PRIVATE,
      name: 'x.webp',
      users: [{ id: 3, file_id: 1, user_id: 22 } as any],
    } as File);
    deleteService.assertCanDelete.mockImplementation(() => {
      throw new ForbiddenException({
        user_id: 'Удалить файл может только автор',
      });
    });

    await expect(
      provider.index(
        { user: { id: 22, role: UserRole.CUSTOMER } }, // читатель, не автор
        'private',
        1,
        'x.webp',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(deleteService.deleteEntity).not.toHaveBeenCalled();
  });
});
