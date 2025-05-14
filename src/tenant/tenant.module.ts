import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaModule } from '../prisma/prisma.module'; // Asegúrate que PrismaModule esté exportando PrismaService

@Module({
    imports: [PrismaModule],
    providers: [TenantService],
    exports: [TenantService], // Exportar para que otros módulos puedan usarlo
})
export class TenantModule { }
