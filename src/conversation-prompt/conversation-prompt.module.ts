import { Module } from '@nestjs/common';
import { ConversationPromptController } from './conversation-prompt.controller';
import { ConversationPromptService } from './conversation-prompt.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationPromptController],
  providers: [ConversationPromptService]
})
export class ConversationPromptModule { }
