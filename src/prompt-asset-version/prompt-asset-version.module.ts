import { Module } from '@nestjs/common';
import { PromptAssetVersionService } from './prompt-asset-version.service';
import { PromptAssetVersionController } from './prompt-asset-version.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [PromptAssetVersionController],
  providers: [PromptAssetVersionService],
})
export class PromptAssetVersionModule {}
