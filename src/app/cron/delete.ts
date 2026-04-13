import { File } from '@/app/entities/file/entity';
import { FileDeleteService } from '@/app/services/delete';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class FilesCronDelete {
  private readonly logger = new Logger(FilesCronDelete.name);
  private readonly batchSize = 1000;

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly fileDeleteService: FileDeleteService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scan(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);

      const total = await this.fileRepository.count({
        where: {
          verified: false,
          created_at: LessThan(cutoff),
        },
      });

      if (total === 0) {
        this.logger.debug(
          '[FilesCronDelete] Нет неверифицированных файлов старше 1 ч.',
        );

        return;
      }

      this.logger.log(
        `[FilesCronDelete] Найдено неверифицированных файлов (created_at > 1 ч. назад): ${total}`,
      );

      let skip = 0;

      while (skip < total) {
        const batch = await this.fileRepository.find({
          where: {
            verified: false,
            created_at: LessThan(cutoff),
          },
          order: { id: 'ASC' },
          take: this.batchSize,
          skip,
        });

        if (batch.length === 0) {
          break;
        }

        await this.processBatch(batch);

        skip += batch.length;
        if (batch.length < this.batchSize) {
          break;
        }
      }
    } catch (error) {
      this.logger.error('[FilesCronDelete] Ошибка при сканировании', error);
    }
  }

  private async processBatch(batch: File[]): Promise<void> {
    this.logger.debug(
      `[FilesCronDelete] Пакет id: ${batch[0]?.id}…${batch[batch.length - 1]?.id} (${batch.length} шт.)`,
    );

    for (const file of batch) {
      try {
        await this.fileDeleteService.deleteEntity(file);
        this.logger.debug(
          `[FilesCronDelete] Удалён неверифицированный файл id=${file.id}`,
        );
      } catch (error) {
        this.logger.error(
          `[FilesCronDelete] Не удалось удалить неверифицированный файл id=${file.id}`,
          error,
        );
      }
    }
  }
}
