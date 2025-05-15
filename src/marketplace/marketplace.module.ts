import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketplaceController } from './marketplace.controller';

@Module({
  imports: [PrismaModule],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
