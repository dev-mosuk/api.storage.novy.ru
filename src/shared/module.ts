import { Global, Module } from '@nestjs/common';
import { AppModule as SharedAppModule } from '@/shared/app/module';
import { IntegrationsModule } from '@/shared/integrations/module';
import { MicroservicesModule } from '@/shared/microservices/module';

@Global()
@Module({
  imports: [SharedAppModule, IntegrationsModule, MicroservicesModule],
  providers: [],
  exports: [SharedAppModule, IntegrationsModule, MicroservicesModule],
})
export class SharedModule {}
