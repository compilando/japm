import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Asegúrate que PrismaModule esté exportando PrismaService
import { UserModule } from '../user/user.module'; // Importar UserModule

@Module({
  imports: [
    PrismaModule,
    UserModule, // Añadir UserModule a los imports
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService], // Exportar para que otros módulos puedan usarlo
})
export class TenantModule {}
