import { Module } from '@nestjs/common';
import { PromptTranslationService } from './prompt-translation.service';
import { PromptTranslationController } from './prompt-translation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ServePromptModule } from '../serve-prompt/serve-prompt.module';

@Module({
  imports: [
    PrismaModule,
    ServePromptModule
  ],
  controllers: [PromptTranslationController],
  providers: [PromptTranslationService],
})
export class PromptTranslationModule { }
