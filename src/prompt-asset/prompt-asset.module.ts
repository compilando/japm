import { Module } from '@nestjs/common';
import { PromptAssetController } from './prompt-asset.controller';
import { PromptAssetService } from './prompt-asset.service';
import { PrismaModule } from '../prisma/prisma.module';
// Importar módulos relacionados si Asset interactúa directamente con ellos
// import { PromptAssetVersionModule } from '../prompt-asset-version/prompt-asset-version.module';
// import { AssetTranslationModule } from '../asset-translation/asset-translation.module';

@Module({
  imports: [
    PrismaModule,
    // PromptAssetVersionModule, // Descomentar si se usan servicios/controladores de ese módulo aquí
    // AssetTranslationModule,
  ],
  controllers: [PromptAssetController],
  providers: [PromptAssetService],
  exports: [PromptAssetService],
})
export class PromptAssetModule {}
