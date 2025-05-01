import { Module } from '@nestjs/common';
import { TacticService } from './tactic.service';
import { TacticController } from './tactic.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TacticController],
  providers: [TacticService],
  exports: [TacticService]
})
export class TacticModule { }
