import { Module } from '@nestjs/common';
import { PromptAssetVersionService } from './prompt-asset-version.service';
import { PromptAssetVersionController } from './prompt-asset-version.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromptAssetVersionController],
  providers: [PromptAssetVersionService],
})
export class PromptAssetVersionModule { }
