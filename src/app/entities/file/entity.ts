import { FileUser } from '@/app/entities/file/users/entity';
import { FileType } from '@/app/enums/enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('files')
@Index(['type'])
@Index(['user_id'])
@Index(['verified'])
@Index(['created_at'])
export class File {
  @ApiProperty({ description: 'id', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Владелец', example: 1 })
  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @ApiProperty({ description: 'Тип', enum: FileType })
  @Column({ type: 'varchar', length: 16 })
  type: FileType;

  @ApiProperty({
    description: 'Название',
    example: 'photo.webp',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ description: 'Размер', nullable: true })
  @Column({ type: 'int', nullable: true })
  size: number | null;

  @ApiProperty({
    description: 'Статус',
  })
  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @ApiProperty({
    description: 'Дата обновления',
    example: '2026-03-30T12:00:00.000Z',
  })
  @UpdateDateColumn()
  updated_at: Date;

  @ApiProperty({
    description: 'Дата создания',
    example: '2026-03-30T12:00:00.000Z',
  })
  @CreateDateColumn()
  created_at: Date;

  // SubRelations

  @ApiProperty({
    description: 'Пользователи',
    type: () => FileUser,
    isArray: true,
  })
  @OneToMany(() => FileUser, (fileUser) => fileUser.file)
  users: FileUser[];
}
