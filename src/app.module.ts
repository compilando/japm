import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { RegionModule } from './region/region.module';
import { CulturalDataModule } from './cultural-data/cultural-data.module';
import { ConversationTacticModule } from './conversation-tactic/conversation-tactic.module';
import { ConversationPromptModule } from './conversation-prompt/conversation-prompt.module';
import { ConversationPromptAssetModule } from './conversation-prompt-asset/conversation-prompt-asset.module';
import { ConversationPromptAssetLinkModule } from './conversation-prompt-asset-link/conversation-prompt-asset-link.module';
import { RagDocumentMetadataModule } from './rag-document-metadata/rag-document-metadata.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ServePromptModule } from './serve-prompt/serve-prompt.module';
import { ProjectModule } from './project/project.module';
import { AiModelModule } from './ai-model/ai-model.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { TagModule } from './tag/tag.module';
import { ConversationPromptVersionModule } from './conversation-prompt-version/conversation-prompt-version.module';
import { PromptTranslationModule } from './prompt-translation/prompt-translation.module';
import { ConversationPromptAssetVersionModule } from './conversation-prompt-asset-version/conversation-prompt-asset-version.module';
import { AssetTranslationModule } from './asset-translation/asset-translation.module';

@Module({
  imports: [
    UserModule,
    RegionModule,
    CulturalDataModule,
    ConversationTacticModule,
    ConversationPromptModule,
    ConversationPromptAssetModule,
    ConversationPromptAssetLinkModule,
    RagDocumentMetadataModule,
    PrismaModule,
    HealthModule,
    ServePromptModule,
    ProjectModule,
    AiModelModule,
    TagModule,
    ConversationPromptVersionModule,
    PromptTranslationModule,
    ConversationPromptAssetVersionModule,
    AssetTranslationModule,
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
