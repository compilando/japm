import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
// TEMPORALMENTE COMENTADO - THROTTLING DESHABILITADO
// import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { LoggerMiddleware } from './common/middleware/logger.middleware';
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
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 5,
    }),
    // TEMPORALMENTE DESHABILITADO PARA DESARROLLO - THROTTLING CAUSANDO PROBLEMAS
    // TODO: Rehabilitar con configuración correcta
    /*
    // Configuración de Rate Limiting con múltiples límites
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get('NODE_ENV') === 'development';
        const throttleEnabled = configService.get('THROTTLE_ENABLED') !== 'false';
        
        // Si está deshabilitado o es desarrollo y no se fuerza, usar límites muy altos
        if (!throttleEnabled || (isDevelopment && !configService.get('THROTTLE_FORCE_IN_DEV'))) {
          return [
            {
              name: 'default',
              ttl: 60000, // 1 minuto
              limit: 10000, // Límite muy alto para desarrollo
            },
          ];
        }
        
        // Configuración normal para producción
        return [
          {
            name: 'default',
            ttl: parseInt(configService.get('THROTTLE_TTL') || '60') * 1000, // 60 segundos por defecto
            limit: parseInt(configService.get('THROTTLE_LIMIT') || '500'), // 500 requests por defecto - muy permisivo
          },
          {
            name: 'auth',
            ttl: parseInt(configService.get('THROTTLE_AUTH_TTL') || '900') * 1000, // 15 minutos
            limit: parseInt(configService.get('THROTTLE_AUTH_LIMIT') || '20'), // 20 intentos de login - permisivo
          },
          {
            name: 'api',
            ttl: parseInt(configService.get('THROTTLE_API_TTL') || '60') * 1000, // 1 minuto
            limit: parseInt(configService.get('THROTTLE_API_LIMIT') || '300'), // 300 requests API - muy permisivo
          },
          {
            name: 'creation',
            ttl: parseInt(configService.get('THROTTLE_CREATION_TTL') || '60') * 1000, // 1 minuto
            limit: parseInt(configService.get('THROTTLE_CREATION_LIMIT') || '100'), // 100 creaciones - permisivo
          },
        ];
      },
    }),
    */
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Audit Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // TEMPORALMENTE DESHABILITADO - THROTTLING CAUSANDO PROBLEMAS EN DESARROLLO
    /*
    // Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    */
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StructuredLoggerMiddleware).forRoutes('*');

    // Optionally, you can also keep the original one for comparison during development
    // consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
