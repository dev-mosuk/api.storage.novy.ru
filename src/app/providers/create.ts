import { File } from '@/app/entities/file/entity';
import { FileCreateInterface } from '@/app/interfaces/create';
import { FileCreateService } from '@/app/services/create';
import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';
import { BulkTransaction } from '@/common/bulk/interfaces/transaction/create';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FastifyRequest } from 'fastify';
import { Repository } from 'typeorm';

@Injectable()
export class StorageCreateProvider {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly fileCreateService: FileCreateService,
  ) {}

  async index(
    authentication: Authentication | undefined,
    request: FastifyRequest,
  ): Promise<BulkTransaction<FileCreateInterface>[]> {
    const isMultipart = (request.headers['content-type'] || '').includes(
      'multipart/form-data',
    );
    const errorField = isMultipart ? 'file' : 'path';

    const results = await this.fileCreateService.createFromUpload(
      this.fileRepository,
      request,
      authentication,
    );

    return Promise.all(
      results.map(
        async (
          result,
          transaction_id,
        ): Promise<BulkTransaction<FileCreateInterface>> => {
          if (result.error) {
            const field = result.errorKey ?? errorField;

            return {
              transaction_id,
              status: BulkTransactionStatus.ERROR,
              errors: {
                [field]: result.error,
              },
            };
          }

          const file = await this.fileRepository.findOne({
            where: { id: result.id ?? 0 },
            relations: ['users'],
          });

          if (!file) {
            return {
              transaction_id,
              status: BulkTransactionStatus.ERROR,
              errors: {
                [errorField]: 'Не удалось получить сохраненный файл',
              },
            };
          }

          return {
            transaction_id,
            status: BulkTransactionStatus.SUCCESS,
            data: {
              id: file.id,
              user_id: file.user_id,
              type: file.type,
              name: file.name,
              size: file.size,
              verified: file.verified,
              created_at: file.created_at,
              updated_at: file.updated_at,
              users: file.users,
              path: result.path ?? null,
            },
          };
        },
      ),
    );
  }
}
