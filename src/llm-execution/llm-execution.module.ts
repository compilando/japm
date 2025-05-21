import { Module } from '@nestjs/common';
import { LlmExecutionService } from './llm-execution.service';
import { LlmExecutionController } from './llm-execution.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PromptResolverService } from '../prompt/prompt-resolver.service';
import { ServePromptModule } from '../serve-prompt/serve-prompt.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ServePromptModule,
  ],
  controllers: [LlmExecutionController],
  providers: [LlmExecutionService, PromptResolverService],
  exports: [LlmExecutionService],
})
export class LlmExecutionModule {}
