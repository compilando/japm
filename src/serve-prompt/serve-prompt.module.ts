import { Module } from '@nestjs/common';
import { ServePromptController } from './serve-prompt.controller';
import { ServePromptService } from './serve-prompt.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServePromptController],
  providers: [ServePromptService]
})
export class ServePromptModule { }
