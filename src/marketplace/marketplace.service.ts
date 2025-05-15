import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PromptVersion,
  PromptAssetVersion,
  MarketplacePublishStatus,
  Prisma,
} from '@prisma/client';

// Podríamos definir DTOs para los queryParams más adelante si se vuelven complejos
export interface MarketplaceQueryParams {
  search?: string;
  tags?: string[]; // Para prompts
  category?: string; // Para assets
  sortBy?: 'createdAt' | 'name' | 'popularity'; // Popularity requeriría un campo de contador de uso
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private prisma: PrismaService) {}

  async getPublishedPrompts(
    tenantId: string,
    params: MarketplaceQueryParams,
  ): Promise<PromptVersion[]> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    this.logger.log(
      `Fetching published prompts for Tenant ID: ${tenantId} with params: ${JSON.stringify(params)}`,
    );

    const whereClause: Prisma.PromptVersionWhereInput = {
      marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
      prompt: {
        project: {
          tenantId: tenantId,
        },
        // Filtrado por búsqueda de texto en el nombre o descripción del prompt
        ...(search && {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }),
        // TODO: Filtrado por tags (requiere ajustar el DTO y la lógica si params.tags es un array de strings)
      },
      // TODO: Podríamos añadir más filtros aquí directamente en PromptVersion si es necesario
    };

    try {
      const prompts = await this.prisma.promptVersion.findMany({
        where: whereClause,
        include: {
          prompt: {
            // Incluir información del prompt padre
            include: {
              tags: true, // Incluir tags del prompt
              project: { select: { id: true, name: true } }, // Información básica del proyecto
            },
          },
          // Podríamos incluir _count de ejecuciones o valoraciones si las tuviéramos
        },
        orderBy: {
          [sortBy === 'name' ? 'prompt' : sortBy]:
            sortBy === 'name' ? { name: sortOrder } : sortOrder,
          // Si sortBy es 'name', necesitamos ordenar por prompt.name.
          // Esto es un poco simplificado; una ordenación más robusta por nombre de prompt podría requerir joins más complejos o post-procesamiento.
          // Para 'popularity', necesitaríamos un campo dedicado.
        },
        skip: skip,
        take: limit,
      });
      this.logger.log(
        `Found ${prompts.length} published prompts for Tenant ID: ${tenantId} with params: ${JSON.stringify(params)}`,
      );
      return prompts;
    } catch (error) {
      this.logger.error(
        `Error fetching published prompts for Tenant ID: ${tenantId} - ${error.message}`,
        error.stack,
      );
      throw error; // Relanzar para que sea manejado por filtros de excepción globales si existen
    }
  }

  async getPublishedAssets(
    tenantId: string,
    params: MarketplaceQueryParams,
  ): Promise<PromptAssetVersion[]> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    this.logger.log(
      `Fetching published assets for Tenant ID: ${tenantId} with params: ${JSON.stringify(params)}`,
    );

    const whereClause: Prisma.PromptAssetVersionWhereInput = {
      marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
      asset: {
        prompt: {
          project: {
            tenantId: tenantId,
          },
        },
        // Filtrado por búsqueda de texto en la key del asset (o podríamos añadir name/description a PromptAsset)
        ...(search && {
          key: { contains: search },
        }),
        // Filtrado por categoría del asset
        // TODO: Añadir campo 'category' a PromptAsset si se necesita este filtro
        // ...(category && { category: category }),
      },
    };

    try {
      const assets = await this.prisma.promptAssetVersion.findMany({
        where: whereClause,
        include: {
          asset: {
            // Incluir información del asset padre
            include: {
              prompt: {
                include: {
                  project: { select: { id: true, name: true } }, // Información básica del proyecto
                },
              },
            },
          },
        },
        orderBy: {
          [sortBy === 'name' ? 'asset' : sortBy]:
            sortBy === 'name' ? { key: sortOrder } : sortOrder,
          // Similar a prompts, ordenar por asset.key si sortBy es 'name' (asumiendo que 'key' es el nombre)
        },
        skip: skip,
        take: limit,
      });
      this.logger.log(
        `Found ${assets.length} published assets for Tenant ID: ${tenantId} with params: ${JSON.stringify(params)}`,
      );
      return assets;
    } catch (error) {
      this.logger.error(
        `Error fetching published assets for Tenant ID: ${tenantId} - ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
