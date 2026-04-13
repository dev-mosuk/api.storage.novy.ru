import { AuthModule } from '@/shared/microservices/auth/module';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule],
  providers: [],
  exports: [AuthModule],
})
export class MicroservicesModule {}
