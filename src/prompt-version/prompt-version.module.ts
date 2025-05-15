import { Module } from '@nestjs/common';
import { PromptVersionService } from './prompt-version.service';
import { PromptVersionController } from './prompt-version.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { ServePromptModule } from '../serve-prompt/serve-prompt.module';

@Module({
  imports: [PrismaModule, TenantModule, ServePromptModule],
  controllers: [PromptVersionController],
  providers: [PromptVersionService],
  exports: [PromptVersionService],
})
export class PromptVersionModule {}
