import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const ormConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService, ModuleRef],

  useFactory: (cfg: ConfigService, moduleRef: ModuleRef) => {
    return {
      type: 'mysql',
      host: cfg.get<string>('API_STORAGE_DB_HOST') ?? 'localhost',
      database: cfg.get('SERVICE_DB_NAME'),
      username: cfg.get('SERVICE_DB_USER'),
      password: cfg.get('SERVICE_DB_PASSWORD'),
      port: 3306,

      entities: ['dist/**/entities/**/*{.js,.ts}'],
      synchronize: true,
      container: moduleRef,
    };
  },
};
