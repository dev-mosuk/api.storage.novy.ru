import { File } from '@/app/entities/file/entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('file_users')
@Unique(['file_id', 'user_id'])
@Index(['user_id'])
export class FileUser {
  @ApiProperty({ description: 'id', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'id файла', example: 1 })
  @Column({ type: 'int' })
  file_id: number;

  @ApiProperty({ description: 'id пользователя', example: 1 })
  @Column({ type: 'int' })
  user_id: number;

  // Relations

  @ApiProperty({ description: 'Файл', type: () => File })
  @ManyToOne(() => File, (file) => file.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  file: File;
}
