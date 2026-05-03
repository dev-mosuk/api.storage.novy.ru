import { File } from '@/app/entities/file/entity';
import { FileUser } from '@/app/entities/file/users/entity';
import { FileType } from '@/app/enums/enum';
import { FileCreateInterface } from '@/app/interfaces/create';
import { parseFileTypeParam } from '@/app/utilities/path/parse/util';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';

@Injectable()
export class FileByPathReadProvider {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(FileUser)
    private readonly fileUserRepository: Repository<FileUser>,
    private readonly configService: ConfigService,
  ) {}

  async index(
    authentication: Authentication | undefined,
    typeParam: string,
    id: number,
    nameParam: string,
    accept?: string,
  ): Promise<StreamableFile | FileCreateInterface> {
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

    const allowed = await this.canReadFile(authentication, file);

    if (!allowed) {
      throw new ForbiddenException({
        user_id: 'Недостаточно прав для чтения файла',
      });
    }

    const wantsJson =
      accept?.toLowerCase().includes('application/json') ?? false;
    if (wantsJson) {
      const baseUrl = this.resolveBaseUrl();

      return {
        ...file,
        path: `${baseUrl}/${file.type}/${file.id}/${file.name}`,
      };
    }

    const diskPath = path.join(process.cwd(), type, String(id), file.name);

    try {
      await fs.access(diskPath);
    } catch {
      throw new NotFoundException({
        path: 'Файл на диске не найден',
      });
    }

    return new StreamableFile(createReadStream(diskPath), {
      type: this.resolveMimeType(file.name),
      disposition: `inline; filename="${encodeURIComponent(file.name)}"`,
    });
  }

  private resolveBaseUrl(): string {
    return this.configService.get<string>('SERVICE_URL');
  }

  private resolveMimeType(name: string): string {
    const ext = path.extname(name).slice(1).toLowerCase();
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      avif: 'image/avif',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      pdf: 'application/pdf',
      txt: 'text/plain; charset=utf-8',
      json: 'application/json; charset=utf-8',
    };

    return map[ext] ?? 'application/octet-stream';
  }

  private async canReadFile(
    authentication: Authentication | undefined,
    file: File,
  ): Promise<boolean> {
    if (file.type === FileType.PUBLIC) {
      return true;
    }

    if (!authentication?.user) {
      return false;
    }

    if (this.isAdmin(authentication)) {
      return true;
    }

    if (file.user_id === authentication.user.id) {
      return true;
    }

    const row = await this.fileUserRepository.findOne({
      where: {
        file_id: file.id,
        user_id: authentication.user.id,
      },
    });

    return !!row;
  }

  private isAdmin(authentication: Authentication | null): boolean {
    if (authentication === null) {
      return true;
    }

    if (!authentication.user) {
      return false;
    }

    if (authentication.user.id === 0) {
      return true;
    }

    return authentication.user.role === UserRole.ADMIN;
  }
}
