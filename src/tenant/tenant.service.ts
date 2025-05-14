import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate que la ruta a PrismaService sea correcta
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
    constructor(private prisma: PrismaService) { }

    async getMarketplaceRequiresApproval(tenantId: string): Promise<boolean> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { marketplaceRequiresApproval: true },
        });

        if (!tenant) {
            // Esto no debería ocurrir si el tenantId viene de un usuario autenticado
            // pero es bueno tener la validación.
            throw new NotFoundException(`Tenant with ID "${tenantId}" not found.`);
        }
        // El campo es Booleano pero puede ser null si no se ha establecido un default en BD
        // o si es un campo nuevo en un registro existente. Prisma devuelve null en ese caso.
        // Nuestro schema tiene @default(true), así que esto es más una salvaguarda.
        return tenant.marketplaceRequiresApproval ?? true;
    }

    // Podríamos añadir un método para actualizar esta configuración más adelante si es necesario
    // async updateMarketplaceConfig(tenantId: string, requiresApproval: boolean): Promise<Tenant> {
    //   // TODO: Añadir lógica de permisos para asegurar que solo un admin puede hacer esto
    //   return this.prisma.tenant.update({
    //     where: { id: tenantId },
    //     data: { marketplaceRequiresApproval: requiresApproval },
    //   });
    // }
} 