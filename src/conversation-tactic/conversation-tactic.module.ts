import { Module } from '@nestjs/common';
import { ConversationTacticController } from './conversation-tactic.controller';
import { ConversationTacticService } from './conversation-tactic.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationTacticController],
  providers: [ConversationTacticService]
})
export class ConversationTacticModule { }
