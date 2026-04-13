import { UserAvatar } from '@/shared/microservices/auth/users/entities/avatar/entity';
import { User } from '@/shared/microservices/auth/users/entities/entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAvatar])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class UsersModule {}
