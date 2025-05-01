import { Module } from '@nestjs/common';
import { PromptTranslationService } from './prompt-translation.service';
import { PromptTranslationController } from './prompt-translation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromptTranslationController],
  providers: [PromptTranslationService],
})
export class PromptTranslationModule { }
