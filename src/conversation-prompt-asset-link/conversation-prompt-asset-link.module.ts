import { Module } from '@nestjs/common';
import { ConversationPromptAssetLinkController } from './conversation-prompt-asset-link.controller';
import { ConversationPromptAssetLinkService } from './conversation-prompt-asset-link.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationPromptAssetLinkController],
  providers: [ConversationPromptAssetLinkService]
})
export class ConversationPromptAssetLinkModule { }
