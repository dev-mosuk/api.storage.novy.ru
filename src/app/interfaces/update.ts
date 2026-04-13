import { File } from '@/app/entities/file/entity';

export interface FileUpdateInterface extends File {
  path: string;
}
