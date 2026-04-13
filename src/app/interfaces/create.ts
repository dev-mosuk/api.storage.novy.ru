import { File } from '@/app/entities/file/entity';

export interface FileCreateInterface extends File {
  path?: string | null;
}
