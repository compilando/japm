import { Module } from '@nestjs/common';
import { AssetTranslationService } from './asset-translation.service';
import { AssetTranslationController } from './asset-translation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetTranslationController],
  providers: [AssetTranslationService],
})
export class AssetTranslationModule {}
