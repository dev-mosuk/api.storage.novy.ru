import { AuthenticationModule } from '@/shared/microservices/auth/authentication/module';
import { AuthorizationModule } from '@/shared/microservices/auth/authorization/module';
import { UsersModule } from '@/shared/microservices/auth/users/module';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthenticationModule, AuthorizationModule, UsersModule],
  providers: [],
  exports: [AuthenticationModule, AuthorizationModule, UsersModule],
})
export class AuthModule {}
