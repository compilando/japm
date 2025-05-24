import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { PromptController } from './prompt.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectModule } from '../project/project.module';
import { SystemPromptModule } from '../system-prompt/system-prompt.module';
import { ConfigModule } from '@nestjs/config';
import { RawExecutionModule } from '../raw-execution/raw-execution.module';
import { RegionModule } from '../region/region.module';
import { TenantModule } from '../tenant/tenant.module';
import { TagModule } from '../tag/tag.module';
import { EnvironmentModule } from '../environment/environment.module';
import { LoggingModule } from '../common/logging.module';

@Module({
  imports: [
    PrismaModule,
    ProjectModule,
    SystemPromptModule,
    ConfigModule,
    RawExecutionModule,
    RegionModule,
    TenantModule,
    TagModule,
    EnvironmentModule,
    LoggingModule,
  ],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule { }
