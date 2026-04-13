import { File } from '@/app/entities/file/entity';
import { FileUser } from '@/app/entities/file/users/entity';
import { CommonModule } from '@/common/module';
import { ormConfig } from '@/config/database/config';
import { SharedModule } from '@/shared/module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { FileDeleteController } from '@/app/controllers/[type]/[id]/[name]/delete';
import { FileReadController } from '@/app/controllers/[type]/[id]/[name]/read';
import { FileUpdateController } from '@/app/controllers/[type]/[id]/[name]/update';
import { FilesCreateController } from '@/app/controllers/create';
import { FilesDeleteController } from '@/app/controllers/delete';
import { FilesUpdateController } from '@/app/controllers/update';
import { FilesCronDelete } from '@/app/cron/delete';
import { FileByPathDeleteProvider } from '@/app/providers/[type]/[id]/[name]/delete';
import { FileByPathReadProvider } from '@/app/providers/[type]/[id]/[name]/read';
import { FileByPathUpdateProvider } from '@/app/providers/[type]/[id]/[name]/update';
import { StorageCreateProvider } from '@/app/providers/create';
import { StorageDeleteProvider } from '@/app/providers/delete';
import { StorageUpdateProvider } from '@/app/providers/update';
import { FileCreateService } from '@/app/services/create';
import { FileDeleteService } from '@/app/services/delete';
import { FileUpdateService } from '@/app/services/update';

@Module({
  imports: [
    TypeOrmModule.forRootAsync(ormConfig),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'),
    }),
    TypeOrmModule.forFeature([File, FileUser]),
    CommonModule,
    SharedModule,
  ],
  controllers: [
    FilesCreateController,
    FilesUpdateController,
    FilesDeleteController,

    FileReadController,
    FileUpdateController,
    FileDeleteController,
  ],
  providers: [
    FileCreateService,
    StorageCreateProvider,
    FilesCronDelete,
    FileUpdateService,
    FileDeleteService,
    StorageUpdateProvider,
    StorageDeleteProvider,
    FileByPathReadProvider,
    FileByPathUpdateProvider,
    FileByPathDeleteProvider,
  ],
})
export class AppModule {}
