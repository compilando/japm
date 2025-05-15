// src/raw-execution/raw-execution.module.ts
import { Module } from '@nestjs/common';
import { RawExecutionController } from './raw-execution.controller';
import { RawExecutionService } from './raw-execution.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // Needed for JwtAuthGuard
import { ConfigModule } from '@nestjs/config'; // Needed for ConfigService
import { SystemPromptModule } from '../system-prompt/system-prompt.module'; // <-- Importar

@Module({
  imports: [
    PrismaModule,
    AuthModule, // Import AuthModule to use JwtAuthGuard
    ConfigModule, // Import ConfigModule to use ConfigService
    SystemPromptModule, // <-- Añadir para poder inyectar SystemPromptService
  ],
  controllers: [RawExecutionController],
  providers: [RawExecutionService],
  exports: [RawExecutionService],
})
export class RawExecutionModule {}
