import { Module } from '@nestjs/common';
import { CulturalDataController } from './cultural-data.controller';
import { CulturalDataService } from './cultural-data.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CulturalDataController],
  providers: [CulturalDataService],
})
export class CulturalDataModule {}
