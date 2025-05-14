import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate que la ruta a PrismaService sea correcta
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
    private readonly logger = new Logger(TenantService.name);

    constructor(private prisma: PrismaService) { }

    async getMarketplaceRequiresApproval(tenantId: string): Promise<boolean> {
        this.logger.log(`Fetching marketplace approval requirement for Tenant ID: ${tenantId}`);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { marketplaceRequiresApproval: true },
        });

        if (!tenant) {
            this.logger.warn(`Tenant not found for ID: ${tenantId} when checking marketplace approval`);
            throw new NotFoundException(`Tenant with ID "${tenantId}" not found.`);
        }

        const requiresApproval = tenant.marketplaceRequiresApproval ?? true;
        this.logger.debug(`Marketplace approval for Tenant ID ${tenantId}: ${requiresApproval}`);
        return requiresApproval;
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