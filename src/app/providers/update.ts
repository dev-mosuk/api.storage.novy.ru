import { FilesUpdateDto } from '@/app/dtos/update';
import { File } from '@/app/entities/file/entity';
import { FileUpdateInterface } from '@/app/interfaces/update';
import { FileUpdateService } from '@/app/services/update';
import { FilePathParse } from '@/app/utilities/path/parse/util';
import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';
import { BulkTransaction } from '@/common/bulk/interfaces/transaction/create';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class StorageUpdateProvider {
  private readonly logger = new Logger(StorageUpdateProvider.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly configService: ConfigService,
    private readonly fileUpdateService: FileUpdateService,
  ) {}

  async index(
    authentication: Authentication,
    dto: FilesUpdateDto[],
  ): Promise<BulkTransaction<FileUpdateInterface>[]> {
    const baseUrl = this.resolveBaseUrl();
    if (!baseUrl.trim()) {
      return dto.map((item, index) => ({
        transaction_id: item.transaction_id ?? index,
        status: BulkTransactionStatus.ERROR,
        errors: {
          path: 'Задайте SERVICE_URL в окружении',
        },
      }));
    }

    const items: BulkTransaction<FileUpdateInterface>[] = [];

    for (const [index, item] of dto.entries()) {
      const bulkTransactionId = item.transaction_id ?? index;
      await this.fileRepository.manager
        .transaction(async (manager) => {
          const parsed = FilePathParse(item.path, baseUrl);
          if (!parsed) {
            throw new BadRequestException({
              path: 'Некорректный path или не совпадает с SERVICE_URL',
            });
          }

          const file = await manager.findOne(File, {
            where: {
              type: parsed.type,
              id: parsed.id,
              name: parsed.name,
            },
          });

          if (!file) {
            throw new NotFoundException({
              path: 'Файл по указанному path не найден',
            });
          }

          const { path: _path, ...payload } = item;

          return this.fileUpdateService.update(
            manager,
            authentication,
            file,
            payload,
          );
        })
        .then((file: File) => {
          items.push({
            transaction_id: bulkTransactionId,
            status: BulkTransactionStatus.SUCCESS,
            data: {
              ...file,
              path: `${baseUrl}/${file.type}/${file.id}/${file.name}`,
            },
          });
        })
        .catch((error: unknown) => {
          if (error instanceof HttpException) {
            const response = error.getResponse() as Record<string, unknown>;
            const {
              message: _msg,
              error: _err,
              statusCode: _sc,
              ...fields
            } = response;

            items.push({
              transaction_id: bulkTransactionId,
              status: BulkTransactionStatus.ERROR,
              errors: fields as Record<string, string>,
            });
          } else {
            this.logger.error(error);
            items.push({
              transaction_id: bulkTransactionId,
              status: BulkTransactionStatus.ERROR,
            });
          }
        });
    }

    return items;
  }

  private resolveBaseUrl(): string {
    return this.configService.get<string>('SERVICE_URL');
  }
}
