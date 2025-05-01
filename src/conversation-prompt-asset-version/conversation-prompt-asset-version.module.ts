import { Module } from '@nestjs/common';
import { ConversationPromptAssetVersionService } from './conversation-prompt-asset-version.service';
import { ConversationPromptAssetVersionController } from './conversation-prompt-asset-version.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationPromptAssetVersionController],
  providers: [ConversationPromptAssetVersionService],
})
export class ConversationPromptAssetVersionModule { }
