import { File } from '@/app/entities/file/entity';
import { parseFileTypeParam } from '@/app/utilities/path/parse/util';
import { FileDeleteService } from '@/app/services/delete';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FileByPathDeleteProvider {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly fileDeleteService: FileDeleteService,
  ) {}

  async index(
    authentication: Authentication,
    typeParam: string,
    id: number,
    nameParam: string,
  ): Promise<void> {
    const type = parseFileTypeParam(typeParam);
    const name = decodeURIComponent(nameParam);

    const file = await this.fileRepository.findOne({
      where: { type, id, name },
      relations: ['users'],
    });

    if (!file) {
      throw new NotFoundException({
        path: 'Файл не найден',
      });
    }

    this.fileDeleteService.assertCanDelete(authentication, file);

    await this.fileDeleteService.deleteEntity(file);
  }
}
