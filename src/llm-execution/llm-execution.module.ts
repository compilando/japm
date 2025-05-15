import { Module, Logger } from '@nestjs/common';
import { LlmExecutionService } from './llm-execution.service';
import { LlmExecutionController } from './llm-execution.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [LlmExecutionService, Logger],
  controllers: [LlmExecutionController],
  exports: [LlmExecutionService],
})
export class LlmExecutionModule {}
