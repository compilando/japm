import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAssetVersion, PromptAsset } from '@prisma/client';
import { TenantService } from '../tenant/tenant.service';
import { MarketplacePublishStatus } from '@prisma/client';

@Injectable()
export class PromptAssetVersionService {
  constructor(
    private prisma: PrismaService,
    private tenantService: TenantService,
  ) { }

  // Helper para obtener el PromptAsset padre y verificar pertenencia al proyecto.
  // Devuelve el PromptAsset con su ID CUID.
  private async getParentAsset(projectId: string, assetKey: string): Promise<PromptAsset> {
    const asset = await this.prisma.promptAsset.findUnique({
      where: {
        project_asset_key_unique: { projectId, key: assetKey } // Corregido
      },
    });
    if (!asset) {
      throw new NotFoundException(`PromptAsset with key "${assetKey}" not found in project "${projectId}".`);
    }
    return asset;
  }

  async create(projectId: string, assetKey: string, createDto: CreatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    const parentAsset = await this.getParentAsset(projectId, assetKey);

    const { versionTag, ...versionData } = createDto; // versionTag es requerido en el DTO

    try {
      return await this.prisma.promptAssetVersion.create({
        data: {
          ...versionData, // value, changeMessage
          versionTag: versionTag,
          asset: { connect: { id: parentAsset.id } }, // Conectar usando el ID CUID del PromptAsset padre
          // status: 'active', // Considerar si las nuevas versiones deben ser activas por defecto
        },
        include: { asset: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Unique constraint violation (assetId + versionTag)
        throw new ConflictException(`Version tag "${versionTag}" already exists for asset "${assetKey}" (ID: ${parentAsset.id}).`);
      }
      console.error(`Error creating version "${versionTag}" for asset "${assetKey}" (ID: ${parentAsset.id}):`, error);
      throw error;
    }
  }

  async findAllForAsset(projectId: string, assetKey: string): Promise<PromptAssetVersion[]> {
    const parentAsset = await this.getParentAsset(projectId, assetKey);
    return this.prisma.promptAssetVersion.findMany({
      where: { assetId: parentAsset.id }, // Filtrar por el ID CUID del PromptAsset padre
      orderBy: { createdAt: 'desc' },
      include: { translations: true }, // asset: false para evitar redundancia si no se necesita
    });
  }

  async findOneByTag(projectId: string, assetKey: string, versionTag: string): Promise<PromptAssetVersion> {
    const parentAsset = await this.getParentAsset(projectId, assetKey);
    const version = await this.prisma.promptAssetVersion.findUnique({
      where: {
        assetId_versionTag: { assetId: parentAsset.id, versionTag: versionTag }
      },
      include: {
        asset: true,
        translations: true
      },
    });

    if (!version) {
      throw new NotFoundException(`PromptAssetVersion with tag "${versionTag}" not found for asset "${assetKey}" (ID: ${parentAsset.id}).`);
    }
    return version;
  }

  async update(projectId: string, assetKey: string, versionTag: string, updateDto: UpdatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    const existingVersion = await this.findOneByTag(projectId, assetKey, versionTag);

    // Excluir campos que no deben actualizarse o no existen en UpdatePromptAssetVersionDto
    const { assetId: _dtoAssetId, versionTag: _dtoVersionTag, ...dataToUpdate } = updateDto as any;

    if (Object.keys(dataToUpdate).length === 0) {
      return existingVersion;
    }

    try {
      return await this.prisma.promptAssetVersion.update({
        where: {
          id: existingVersion.id // Usar el CUID id de la PromptAssetVersion para la actualización
        },
        data: dataToUpdate,
        include: { asset: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptAssetVersion with ID "${existingVersion.id}" not found during update.`);
      }
      console.error(`Error updating version ID "${existingVersion.id}" for asset "${assetKey}" with tag "${versionTag}":`, error);
      throw error;
    }
  }

  async remove(projectId: string, assetKey: string, versionTag: string): Promise<PromptAssetVersion> {
    const existingVersion = await this.findOneByTag(projectId, assetKey, versionTag);

    try {
      return await this.prisma.promptAssetVersion.delete({
        where: {
          id: existingVersion.id // Usar el CUID id de la PromptAssetVersion para la eliminación
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`PromptAssetVersion with ID "${existingVersion.id}" not found during deletion.`);
        }
        if (error.code === 'P2003') {
          throw new ConflictException(`Cannot delete AssetVersion ID "${existingVersion.id}" (Tag: "${versionTag}", AssetKey: "${assetKey}") because it is still referenced.`);
        }
      }
      console.error(`Error deleting version ID "${existingVersion.id}" for asset "${assetKey}" with tag "${versionTag}":`, error);
      throw error;
    }
  }

  async findOne(id: string): Promise<PromptAssetVersion | null> {
    return this.prisma.promptAssetVersion.findUnique({
      where: { id },
      include: {
        asset: true,
        translations: true
      }
    });
  }

  // --- Marketplace Methods ---

  async requestPublish(projectId: string, assetKey: string, versionTag: string, requesterId: string): Promise<PromptAssetVersion> {
    // findOneByTag ya incluye el asset. El asset tiene projectId.
    const assetVersion = await this.findOneByTag(projectId, assetKey, versionTag);

    // Para obtener tenantId, necesitamos cargar el proyecto asociado al asset.
    // El parentAsset ya tiene el projectId correcto debido a getParentAsset dentro de findOneByTag.
    const parentAssetWithProject = await this.prisma.promptAsset.findUnique({
      where: { id: assetVersion.assetId }, // assetVersion.assetId es el CUID del PromptAsset
      include: { project: { select: { tenantId: true } } },
    });

    if (!parentAssetWithProject || !parentAssetWithProject.project) {
      throw new NotFoundException(`Project not found for asset "${assetKey}" to determine tenant configuration.`);
    }
    const tenantId = parentAssetWithProject.project.tenantId;

    const requiresApproval = await this.tenantService.getMarketplaceRequiresApproval(tenantId);

    if (requiresApproval) {
      return this.prisma.promptAssetVersion.update({
        where: { id: assetVersion.id },
        data: {
          marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
          marketplaceRequestedAt: new Date(),
          marketplaceRequesterId: requesterId,
          marketplaceApprovedAt: null,
          marketplaceApproverId: null,
          marketplacePublishedAt: null,
          marketplaceRejectionReason: null,
        },
      });
    } else {
      return this.prisma.promptAssetVersion.update({
        where: { id: assetVersion.id },
        data: {
          marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
          marketplacePublishedAt: new Date(),
          marketplaceRequestedAt: new Date(),
          marketplaceRequesterId: requesterId,
          marketplaceApprovedAt: null,
          marketplaceApproverId: null,
          marketplaceRejectionReason: null,
        },
      });
    }
  }

  async unpublish(projectId: string, assetKey: string, versionTag: string, /* userId: string */): Promise<PromptAssetVersion> {
    const assetVersion = await this.findOneByTag(projectId, assetKey, versionTag);

    if (assetVersion.marketplaceStatus === MarketplacePublishStatus.NOT_PUBLISHED) {
      return assetVersion;
    }

    return this.prisma.promptAssetVersion.update({
      where: { id: assetVersion.id },
      data: {
        marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
        marketplacePublishedAt: null,
        marketplaceApprovedAt: null,
        marketplaceApproverId: null,
        marketplaceRequestedAt: null,
        marketplaceRequesterId: null,
        marketplaceRejectionReason: null,
      },
    });
  }
  // TODO: Métodos para approve, reject, cancel (Fase 2)
}
