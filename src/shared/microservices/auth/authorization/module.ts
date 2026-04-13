import { AuthorizationUserRoleGuard } from '@/shared/microservices/auth/authorization/guards/user/role/guard';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [AuthorizationUserRoleGuard],
  exports: [AuthorizationUserRoleGuard],
})
export class AuthorizationModule {}
