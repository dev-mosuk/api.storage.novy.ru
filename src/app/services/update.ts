import { FileUpdateDto } from '@/app/dtos/[type]/[id]/[name]/update';
import { File } from '@/app/entities/file/entity';
import { FileUser } from '@/app/entities/file/users/entity';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class FileUpdateService {
  async update(
    manager: EntityManager,
    authentication: Authentication,
    file: File,
    dto: FileUpdateDto,
  ): Promise<File> {
    this.assertCanUpdateFile(authentication, file);

    if (
      dto.verified === undefined &&
      dto.users === undefined &&
      dto.user_id === undefined
    ) {
      throw new BadRequestException({
        path: 'Укажите verified, user_id и/или users',
      });
    }

    if (dto.user_id !== undefined) {
      file.user_id = dto.user_id;
    }

    if (dto.verified !== undefined) {
      file.verified = dto.verified;
    }

    if (dto.users !== undefined) {
      await manager.delete(FileUser, { file_id: file.id });

      const unique = [...new Set(dto.users.map((user) => user.user_id))];
      for (const user_id of unique) {
        await manager.save(
          FileUser,
          manager.create(FileUser, { file_id: file.id, user_id }),
        );
      }
    }

    await manager.update(
      File,
      { id: file.id },
      {
        user_id: file.user_id,
        verified: file.verified,
      },
    );

    const reloaded = await manager.findOne(File, {
      where: { id: file.id },
      relations: ['users'],
    });

    if (!reloaded) {
      throw new BadRequestException({
        path: 'Не удалось перечитать файл после обновления',
      });
    }

    return reloaded;
  }

  /**
   * user_id, verified, users (читатели) — только автор файла, ADMIN или MICROSERVICE.
   * Файл без `user_id` в БД может менять только ADMIN или MICROSERVICE.
   */
  private assertCanUpdateFile(
    authentication: Authentication,
    file: File,
  ): void {
    const user = authentication.user as NonNullable<Authentication['user']>;

    if (user.role === UserRole.ADMIN || user.role === UserRole.MICROSERVICE) {
      return;
    }

    if (file.user_id !== null && file.user_id === user.id) {
      return;
    }

    throw new ForbiddenException({
      user_id: 'Изменять файл может только автор',
    });
  }
}
