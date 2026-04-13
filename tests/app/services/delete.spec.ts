import { File } from '@/app/entities/file/entity';
import { FileType } from '@/app/enums/enum';
import { FileDeleteService } from '@/app/services/delete';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

describe('FileDeleteService', () => {
  let service: FileDeleteService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FileDeleteService,
        {
          provide: getRepositoryToken(File),
          useValue: { delete: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = moduleRef.get(FileDeleteService);
  });

  const file = (overrides: Partial<File> = {}): File =>
    ({
      id: 1,
      user_id: 7,
      type: FileType.PUBLIC,
      name: 'a.webp',
      size: 1,
      verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      users: [],
      ...overrides,
    }) as File;

  it('разрешает удаление автору', () => {
    expect(() =>
      service.assertCanDelete(
        { user: { id: 7, role: UserRole.CUSTOMER } },
        file(),
      ),
    ).not.toThrow();
  });

  it('разрешает удаление admin/microservice', () => {
    expect(() =>
      service.assertCanDelete(
        { user: { id: 1, role: UserRole.ADMIN } },
        file(),
      ),
    ).not.toThrow();
    expect(() =>
      service.assertCanDelete(
        { user: { id: 1, role: UserRole.MICROSERVICE } },
        file(),
      ),
    ).not.toThrow();
  });

  it('запрещает удаление чужого файла', () => {
    expect(() =>
      service.assertCanDelete(
        { user: { id: 8, role: UserRole.CUSTOMER } },
        file({ user_id: 7 }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('запрещает удаление читателю private-файла (если он не автор)', () => {
    expect(() =>
      service.assertCanDelete(
        { user: { id: 22, role: UserRole.CUSTOMER } },
        file({
          user_id: 7,
          type: FileType.PRIVATE,
          users: [{ id: 1, file_id: 1, user_id: 22 } as any],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
