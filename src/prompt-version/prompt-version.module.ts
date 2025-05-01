import { Module } from '@nestjs/common';
import { PromptVersionService } from './prompt-version.service';
import { PromptVersionController } from './prompt-version.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromptVersionController],
  providers: [PromptVersionService],
  exports: [PromptVersionService]
})
export class PromptVersionModule { }
