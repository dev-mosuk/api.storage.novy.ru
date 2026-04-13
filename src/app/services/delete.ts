import { File } from '@/app/entities/file/entity';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';

@Injectable()
export class FileDeleteService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  /**
   * Удаление может только автор (`user_id`), ADMIN или MICROSERVICE.
   * Файл без `user_id` — только ADMIN или MICROSERVICE.
   */
  assertCanDelete(authentication: Authentication, file: File): void {
    const user = authentication.user as NonNullable<Authentication['user']>;

    if (user.role === UserRole.ADMIN || user.role === UserRole.MICROSERVICE) {
      return;
    }

    if (file.user_id !== null && file.user_id === user.id) {
      return;
    }

    throw new ForbiddenException({
      user_id: 'Удалить файл может только автор',
    });
  }

  /**
   * Удаление файла с диска и из БД (права — через `assertCanDelete` до вызова).
   */
  async deleteEntity(file: File): Promise<void> {
    const fileDir = path.join(process.cwd(), file.type, String(file.id));

    await fs.rm(fileDir, { recursive: true, force: true });

    await this.fileRepository.delete({ id: file.id });
  }
}
