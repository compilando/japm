import { Module } from '@nestjs/common';
import { PromptAssetLinkController } from './prompt-asset-link.controller';
import { PromptAssetLinkService } from './prompt-asset-link.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromptAssetLinkController],
  providers: [PromptAssetLinkService]
})
export class PromptAssetLinkModule { }
