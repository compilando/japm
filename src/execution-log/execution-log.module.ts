import { Module } from '@nestjs/common';
import { ExecutionLogService } from './execution-log.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Importar PrismaModule para que el servicio pueda usar PrismaService
  providers: [ExecutionLogService],
  exports: [ExecutionLogService], // Exportar el servicio para que otros módulos puedan usarlo
})
export class ExecutionLogModule {}
