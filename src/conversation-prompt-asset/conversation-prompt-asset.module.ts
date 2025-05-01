import { Module } from '@nestjs/common';
import { ConversationPromptAssetController } from './conversation-prompt-asset.controller';
import { ConversationPromptAssetService } from './conversation-prompt-asset.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationPromptAssetController],
  providers: [ConversationPromptAssetService]
})
export class ConversationPromptAssetModule { }
