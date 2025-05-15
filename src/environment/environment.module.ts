import { Module } from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import { EnvironmentController } from './environment.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Ajusta la ruta si es necesario

@Module({
  imports: [PrismaModule], // Importa PrismaModule para que PrismaService esté disponible
  controllers: [EnvironmentController],
  providers: [EnvironmentService],
  exports: [EnvironmentService], // Exporta el servicio si otros módulos necesitan usarlo
})
export class EnvironmentModule {}
