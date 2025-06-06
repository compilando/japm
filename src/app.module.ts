import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UserModule } from './user/user.module';
import { RegionModule } from './region/region.module';
import { CulturalDataModule } from './cultural-data/cultural-data.module';
import { PromptModule } from './prompt/prompt.module';
import { PromptAssetModule } from './prompt-asset/prompt-asset.module';
import { RagDocumentMetadataModule } from './rag-document-metadata/rag-document-metadata.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ServePromptModule } from './serve-prompt/serve-prompt.module';
import { ProjectModule } from './project/project.module';
import { AiModelModule } from './ai-model/ai-model.module';
import { StructuredLoggerMiddleware } from './common/middleware/structured-logger.middleware';
import { LoggingModule } from './common/logging.module';
import { TagModule } from './tag/tag.module';
import { PromptVersionModule } from './prompt-version/prompt-version.module';
import { PromptTranslationModule } from './prompt-translation/prompt-translation.module';
import { PromptAssetVersionModule } from './prompt-asset-version/prompt-asset-version.module';
import { AssetTranslationModule } from './asset-translation/asset-translation.module';
import { ExecutionLogModule } from './execution-log/execution-log.module';
import { EnvironmentModule } from './environment/environment.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmExecutionModule } from './llm-execution/llm-execution.module';
import { SystemPromptModule } from './system-prompt/system-prompt.module';
import { RawExecutionModule } from './raw-execution/raw-execution.module';
import { TenantModule } from './tenant/tenant.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ActivityLogModule } from './services/activity-log.module';
import { ActivityLogService } from './services/activityLogService';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 5,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get('NODE_ENV') === 'development';
        const throttleEnabled =
          configService.get('THROTTLE_ENABLED') !== 'false';

        if (
          !throttleEnabled ||
          (isDevelopment && !configService.get('THROTTLE_FORCE_IN_DEV'))
        ) {
          return [
            {
              name: 'default',
              ttl: 60000,
              limit: 10000,
            },
          ];
        }

        return [
          {
            name: 'default',
            ttl: parseInt(configService.get('THROTTLE_TTL') || '60') * 1000,
            limit: parseInt(configService.get('THROTTLE_LIMIT') || '500'),
          },
        ];
      },
    }),
    LoggingModule,
    PrismaModule,
    UserModule,
    AuthModule,
    RegionModule,
    CulturalDataModule,
    PromptModule,
    PromptAssetModule,
    RagDocumentMetadataModule,
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
    LlmExecutionModule,
    SystemPromptModule,
    RawExecutionModule,
    TenantModule,
    MarketplaceModule,
    DashboardModule,
    ActivityLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ActivityLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly activityLogService: ActivityLogService) { }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StructuredLoggerMiddleware).forRoutes('*');
  }
}
