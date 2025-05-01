import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { RegionModule } from './region/region.module';
import { CulturalDataModule } from './cultural-data/cultural-data.module';
import { TacticModule } from './tactic/tactic.module';
import { PromptModule } from './prompt/prompt.module';
import { PromptAssetModule } from './prompt-asset/prompt-asset.module';
import { PromptAssetLinkModule } from './prompt-asset-link/prompt-asset-link.module';
import { RagDocumentMetadataModule } from './rag-document-metadata/rag-document-metadata.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ServePromptModule } from './serve-prompt/serve-prompt.module';
import { ProjectModule } from './project/project.module';
import { AiModelModule } from './ai-model/ai-model.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { TagModule } from './tag/tag.module';
import { PromptVersionModule } from './prompt-version/prompt-version.module';
import { PromptTranslationModule } from './prompt-translation/prompt-translation.module';
import { PromptAssetVersionModule } from './prompt-asset-version/prompt-asset-version.module';
import { AssetTranslationModule } from './asset-translation/asset-translation.module';
import { ExecutionLogModule } from './execution-log/execution-log.module';
import { EnvironmentModule } from './environment/environment.module';

@Module({
  imports: [
    UserModule,
    RegionModule,
    CulturalDataModule,
    TacticModule,
    PromptModule,
    PromptAssetModule,
    PromptAssetLinkModule,
    RagDocumentMetadataModule,
    PrismaModule,
    HealthModule,
    ServePromptModule,
    ProjectModule,
    AiModelModule,
    TagModule,
    PromptVersionModule,
    PromptTranslationModule,
    PromptAssetVersionModule,
    AssetTranslationModule,
    ExecutionLogModule,
    EnvironmentModule,
    TagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
