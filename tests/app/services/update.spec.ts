import { File } from '@/app/entities/file/entity';
import { FileUser } from '@/app/entities/file/users/entity';
import { FileType } from '@/app/enums/enum';
import { FileUpdateService } from '@/app/services/update';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

describe('FileUpdateService', () => {
  let service: FileUpdateService;
  let manager: jest.Mocked<
    Pick<EntityManager, 'delete' | 'save' | 'findOne' | 'create' | 'update'>
  >;

  beforeEach(() => {
    service = new FileUpdateService();
    manager = {
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      create: jest.fn((_entity, plain) => plain),
      update: jest
        .fn()
        .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] }),
    };
  });

  const file = (overrides: Partial<File> = {}): File =>
    ({
      id: 10,
      user_id: 7,
      type: FileType.PRIVATE,
      name: 'x.webp',
      size: 100,
      verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      users: [],
      ...overrides,
    }) as File;

  it('разрешает обновление автору', async () => {
    const entity = file();
    const reloaded = { ...entity, verified: true } as File;
    manager.findOne.mockResolvedValue(reloaded);

    const out = await service.update(
      manager as unknown as EntityManager,
      { user: { id: 7, role: UserRole.CUSTOMER } },
      entity,
      { verified: true },
    );

    expect(manager.update).toHaveBeenCalledWith(
      File,
      { id: 10 },
      { user_id: 7, verified: true },
    );
    expect(out.verified).toBe(true);
  });

  it('запрещает обновление не-автору без привилегий', async () => {
    await expect(
      service.update(
        manager as unknown as EntityManager,
        { user: { id: 8, role: UserRole.CUSTOMER } },
        file(),
        { verified: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('не даёт чужому пользователю сменить owner (user_id) файла', async () => {
    await expect(
      service.update(
        manager as unknown as EntityManager,
        { user: { id: 99, role: UserRole.CUSTOMER } },
        file({ user_id: 7 }),
        { user_id: 99 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('не даёт читателю private-файла перезаписать users в БД', async () => {
    await expect(
      service.update(
        manager as unknown as EntityManager,
        { user: { id: 22, role: UserRole.CUSTOMER } }, // читатель, но не автор
        file({
          user_id: 7,
          type: FileType.PRIVATE,
          users: [{ id: 1, file_id: 10, user_id: 22 } as any],
        }),
        { users: [{ user_id: 33 }] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('разрешает обновление админу', async () => {
    const entity = file();
    manager.findOne.mockResolvedValue(entity);

    await expect(
      service.update(
        manager as unknown as EntityManager,
        { user: { id: 999, role: UserRole.ADMIN } },
        entity,
        { verified: true },
      ),
    ).resolves.toBeDefined();
  });

  it('разрешает обновлять users для public-файла', async () => {
    const entity = file({ type: FileType.PUBLIC });
    const reloaded = { ...entity, users: [] } as File;
    manager.findOne.mockResolvedValue(reloaded);

    const out = await service.update(
      manager as unknown as EntityManager,
      { user: { id: 7, role: UserRole.CUSTOMER } },
      entity,
      { users: [{ user_id: 2 }] },
    );

    expect(manager.delete).toHaveBeenCalledWith(FileUser, { file_id: 10 });
    expect(manager.update).toHaveBeenCalledWith(
      File,
      { id: 10 },
      { user_id: 7, verified: false },
    );
    expect(manager.save).toHaveBeenCalled();
    expect(out).toBe(reloaded);
  });
});
