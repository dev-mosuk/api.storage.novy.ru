import { FileDeleteDto } from '@/app/dtos/delete';
import { File } from '@/app/entities/file/entity';
import { FileDeleteService } from '@/app/services/delete';
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
export class StorageDeleteProvider {
  private readonly logger = new Logger(StorageDeleteProvider.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly configService: ConfigService,
    private readonly fileDeleteService: FileDeleteService,
  ) {}

  async index(
    authentication: Authentication,
    dto: FileDeleteDto[],
  ): Promise<BulkTransaction<{ path: string }>[]> {
    const baseUrl = this.resolveBaseUrl();
    if (!baseUrl.trim()) {
      return dto.map((_, transaction_id) => ({
        transaction_id,
        status: BulkTransactionStatus.ERROR,
        errors: {
          path: 'Задайте SERVICE_URL или STORAGE_URL в окружении',
        },
      }));
    }

    const items: BulkTransaction<{ path: string }>[] = [];

    for (const [transaction_id, item] of dto.entries()) {
      try {
        const parsed = FilePathParse(item.path, baseUrl);
        if (!parsed) {
          throw new BadRequestException({
            path: 'Некорректный path или не совпадает с SERVICE_URL / STORAGE_URL',
          });
        }

        const file = await this.fileRepository.findOne({
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

        this.fileDeleteService.assertCanDelete(authentication, file);

        await this.fileDeleteService.deleteEntity(file);

        items.push({
          transaction_id,
          status: BulkTransactionStatus.SUCCESS,
          data: { path: item.path },
        });
      } catch (error) {
        if (error instanceof HttpException) {
          const response = error.getResponse() as Record<string, unknown>;
          const {
            message: _msg,
            error: _err,
            statusCode: _sc,
            ...fields
          } = response;

          items.push({
            transaction_id,
            status: BulkTransactionStatus.ERROR,
            errors: fields as Record<string, string>,
          });
        } else {
          this.logger.error(error);
          items.push({
            transaction_id,
            status: BulkTransactionStatus.ERROR,
          });
        }
      }
    }

    return items;
  }

  private resolveBaseUrl(): string {
    return (
      this.configService.get<string>('SERVICE_URL') ??
      this.configService.get<string>('STORAGE_URL') ??
      ''
    );
  }
}
