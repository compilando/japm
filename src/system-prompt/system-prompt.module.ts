import { Module } from '@nestjs/common';
import { SystemPromptController } from './system-prompt.controller';
import { SystemPromptService } from './system-prompt.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemPromptController],
  providers: [SystemPromptService],
  exports: [SystemPromptService],
})
export class SystemPromptModule {}
