import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { PromptController } from './prompt.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectModule } from '../project/project.module';
import { SystemPromptModule } from '../system-prompt/system-prompt.module';
import { ConfigModule } from '@nestjs/config';
import { RawExecutionModule } from '../raw-execution/raw-execution.module';

@Module({
  imports: [
    PrismaModule,
    ProjectModule,
    SystemPromptModule,
    ConfigModule,
    RawExecutionModule,
  ],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
