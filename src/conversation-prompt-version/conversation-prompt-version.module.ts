import { Module } from '@nestjs/common';
import { ConversationPromptVersionService } from './conversation-prompt-version.service';
import { ConversationPromptVersionController } from './conversation-prompt-version.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationPromptVersionController],
  providers: [ConversationPromptVersionService],
})
export class ConversationPromptVersionModule { }
