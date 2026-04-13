import { File } from '@/app/entities/file/entity';
import { FileUpdateDto } from '@/app/dtos/[type]/[id]/[name]/update';
import { FileUpdateService } from '@/app/services/update';
import { parseFileTypeParam } from '@/app/utilities/path/parse/util';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FileByPathUpdateProvider {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly fileUpdateService: FileUpdateService,
  ) {}

  async index(
    authentication: Authentication,
    typeParam: string,
    id: number,
    nameParam: string,
    dto: FileUpdateDto,
  ): Promise<File> {
    const type = parseFileTypeParam(typeParam);
    const name = decodeURIComponent(nameParam);

    return this.fileRepository.manager.transaction(async (manager) => {
      const file = await manager.findOne(File, {
        where: { type, id, name },
      });

      if (!file) {
        throw new NotFoundException({
          path: 'Файл не найден',
        });
      }

      return this.fileUpdateService.update(manager, authentication, file, dto);
    });
  }
}
