import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAssetVersion, PromptAsset } from '@prisma/client';
import { TenantService } from '../tenant/tenant.service';
import { MarketplacePublishStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class PromptAssetVersionService {
  private readonly logger = new Logger(PromptAssetVersionService.name);

  constructor(
    private prisma: PrismaService,
    private tenantService: TenantService,
  ) { }

  // Helper para obtener el PromptAsset padre.
  // Devuelve el PromptAsset con su ID CUID.
  private async getParentAsset(
    projectId: string,
    promptId: string,
    assetKey: string,
  ): Promise<PromptAsset> {
    const asset = await this.prisma.promptAsset.findUnique({
      where: {
        prompt_asset_key_unique: { projectId, promptId, key: assetKey },
      },
      // Incluir prompt y project para validación o uso posterior si es necesario
      include: { prompt: { include: { project: true } } },
    });
    if (!asset) {
      throw new NotFoundException(
        `PromptAsset with key "${assetKey}" for prompt "${promptId}" not found in project "${projectId}".`,
      );
    }
    // Opcional: Verificar que asset.prompt.projectId === projectId
    // Esto debería ser garantizado por la clave única si los IDs son correctos.
    if (asset.prompt.projectId !== projectId) {
      throw new ForbiddenException(
        'Mismatch between asset project and provided project ID.',
      );
    }
    return asset;
  }

  async create(
    projectId: string,
    promptId: string,
    assetKey: string,
    createDto: CreatePromptAssetVersionDto,
  ): Promise<PromptAssetVersion> {
    const parentAsset = await this.getParentAsset(
      projectId,
      promptId,
      assetKey,
    );

    const { versionTag, ...versionData } = createDto; // versionTag es requerido en el DTO

    try {
      return await this.prisma.promptAssetVersion.create({
        data: {
          ...versionData, // value, changeMessage, languageCode
          versionTag: versionTag,
          asset: { connect: { id: parentAsset.id } }, // Conectar usando el ID CUID del PromptAsset padre
          // status: 'active', // Considerar si las nuevas versiones deben ser activas por defecto
        },
        include: { asset: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Unique constraint violation (assetId + versionTag)
        throw new ConflictException(
          `Version tag "${versionTag}" already exists for asset "${assetKey}" (ID: ${parentAsset.id}).`,
        );
      }
      console.error(
        `Error creating version "${versionTag}" for asset "${assetKey}" (ID: ${parentAsset.id}):`,
        error,
      );
      throw error;
    }
  }

  async findAllForAsset(
    projectId: string,
    promptId: string,
    assetKey: string,
    languageCode?: string,
  ): Promise<PromptAssetVersion[]> {
    const parentAsset = await this.getParentAsset(
      projectId,
      promptId,
      assetKey,
    );
    return this.prisma.promptAssetVersion.findMany({
      where: {
        assetId: parentAsset.id,
        ...(languageCode ? { languageCode } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { translations: true },
    });
  }

  async findOneByTag(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    languageCode?: string,
  ): Promise<PromptAssetVersion> {
    const parentAsset = await this.getParentAsset(
      projectId,
      promptId,
      assetKey,
    );
    let version: PromptAssetVersion | null = null;
    if (languageCode) {
      version = await this.prisma.promptAssetVersion.findFirst({
        where: {
          assetId: parentAsset.id,
          versionTag,
          translations: {
            some: {
              languageCode
            }
          }
        },
        include: {
          asset: true,
          translations: true,
        },
      });
    } else {
      version = await this.prisma.promptAssetVersion.findUnique({
        where: {
          assetId_versionTag: { assetId: parentAsset.id, versionTag: versionTag },
        },
        include: {
          asset: true,
          translations: true,
        },
      });
    }
    if (!version) {
      throw new NotFoundException(
        `PromptAssetVersion with tag "${versionTag}"${languageCode ? ` and languageCode "${languageCode}"` : ''} not found for asset "${assetKey}" (ID: ${parentAsset.id}).`,
      );
    }
    return version;
  }

  async update(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    updateDto: UpdatePromptAssetVersionDto,
  ): Promise<PromptAssetVersion> {
    const existingVersion = await this.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );

    // Excluir campos que no deben actualizarse o no existen en UpdatePromptAssetVersionDto
    const {
      assetId: _dtoAssetId,
      versionTag: _dtoVersionTag,
      ...dataToUpdate
    } = updateDto as any;

    if (Object.keys(dataToUpdate).length === 0) {
      return existingVersion;
    }

    try {
      return await this.prisma.promptAssetVersion.update({
        where: {
          id: existingVersion.id, // Usar el CUID id de la PromptAssetVersion para la actualización
        },
        data: dataToUpdate, // value, changeMessage, languageCode
        include: { asset: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `PromptAssetVersion with ID "${existingVersion.id}" not found during update.`,
        );
      }
      console.error(
        `Error updating version ID "${existingVersion.id}" for asset "${assetKey}" with tag "${versionTag}":`,
        error,
      );
      throw error;
    }
  }

  async remove(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
  ): Promise<PromptAssetVersion> {
    this.logger.log(`Attempting to delete asset version "${versionTag}" for asset "${assetKey}" in prompt "${promptId}" (project "${projectId}")`);

    let existingVersion: PromptAssetVersion;
    try {
      existingVersion = await this.findOneByTag(
        projectId,
        promptId,
        assetKey,
        versionTag,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Version already doesn't exist - this is idempotent behavior
        this.logger.log(`Asset version "${versionTag}" not found for asset "${assetKey}" in prompt "${promptId}" - already deleted or never existed`);
        
        // Return a mock asset version object to maintain API compatibility
        const mockVersion: PromptAssetVersion = {
          id: `deleted-${versionTag}-${assetKey}-${Date.now()}`,
          assetId: `unknown-asset-${Date.now()}`,
          value: '',
          versionTag,
          changeMessage: 'Already deleted or never existed',
          status: 'active',
          languageCode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          marketplaceStatus: 'NOT_PUBLISHED' as any,
          marketplacePublishedAt: null,
          marketplaceRequestedAt: null,
          marketplaceApprovedAt: null,
          marketplaceRejectionReason: null,
          marketplaceRequesterId: null,
          marketplaceApproverId: null,
        };
        
        return mockVersion; // Return successfully (idempotent)
      }
      
      this.logger.error(`Error finding asset version "${versionTag}" for deletion: ${error.message}`, error.stack);
      throw error;
    }

    try {
      const deletedVersion = await this.prisma.promptAssetVersion.delete({
        where: {
          id: existingVersion.id, // Usar el CUID id de la PromptAssetVersion para la eliminación
        },
      });

      this.logger.log(`Successfully deleted asset version "${versionTag}" (ID: ${existingVersion.id}) for asset "${assetKey}"`);
      return deletedVersion;

    } catch (error) {
      // Handle specific Prisma errors for idempotent behavior
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // Version was deleted by another process between findOneByTag and delete
        this.logger.log(`Asset version "${versionTag}" was already deleted by another process during deletion attempt`);
        
        // Return the existing version data (successful idempotent operation)
        return existingVersion;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          `Cannot delete AssetVersion ID "${existingVersion.id}" (Tag: "${versionTag}", AssetKey: "${assetKey}") because it is still referenced.`,
        );
      }

      this.logger.error(`Error deleting version ID "${existingVersion.id}" for asset "${assetKey}" with tag "${versionTag}":`, error);
      throw error;
    }
  }

  async findOne(id: string): Promise<PromptAssetVersion | null> {
    return this.prisma.promptAssetVersion.findUnique({
      where: { id },
      include: {
        asset: true,
        translations: true,
      },
    });
  }

  // --- Marketplace Methods ---

  async requestPublish(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    requesterId: string,
  ): Promise<PromptAssetVersion> {
    const assetVersion = await this.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );

    // Para obtener tenantId, necesitamos cargar el prompt y el proyecto asociado al asset.
    // assetVersion.assetId es el CUID del PromptAsset
    const parentAssetWithFullPrompt = await this.prisma.promptAsset.findUnique({
      where: { id: assetVersion.assetId },
      include: {
        prompt: {
          include: {
            project: { select: { tenantId: true } },
          },
        },
      },
    });

    if (
      !parentAssetWithFullPrompt ||
      !parentAssetWithFullPrompt.prompt ||
      !parentAssetWithFullPrompt.prompt.project
    ) {
      throw new NotFoundException(
        `Project or Prompt not found for asset "${assetKey}" (ID: ${assetVersion.assetId}) to determine tenant configuration.`,
      );
    }
    const tenantId = parentAssetWithFullPrompt.prompt.project.tenantId;

    const requiresApproval =
      await this.tenantService.getMarketplaceRequiresApproval(tenantId);

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

  async unpublish(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string /* userId: string */,
  ): Promise<PromptAssetVersion> {
    const assetVersion = await this.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );

    if (
      assetVersion.marketplaceStatus === MarketplacePublishStatus.NOT_PUBLISHED
    ) {
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

  async approvePublish(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    approverId: string,
  ): Promise<PromptAssetVersion> {
    const assetVersion = await this.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );

    // Adicionalmente, verificar que el approver tiene permiso (ej. es ADMIN o TENANT_ADMIN del tenant correcto)
    // Esto requeriría cargar el tenantId como en requestPublish y luego verificar el rol del approverId.
    // Por simplicidad, esta lógica de autorización avanzada se omite aquí pero sería importante en producción.

    if (
      assetVersion.marketplaceStatus !==
      MarketplacePublishStatus.PENDING_APPROVAL
    ) {
      throw new ForbiddenException(
        'Cannot approve a version that is not pending approval.',
      );
    }

    return this.prisma.promptAssetVersion.update({
      where: { id: assetVersion.id },
      data: {
        marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
        marketplaceApprovedAt: new Date(),
        marketplaceApproverId: approverId,
        marketplacePublishedAt: new Date(),
        marketplaceRejectionReason: null,
      },
    });
  }

  async rejectPublish(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    approverId: string,
    rejectionReason: string,
  ): Promise<PromptAssetVersion> {
    const assetVersion = await this.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );

    // Similar a approvePublish, aquí iría la lógica de autorización del approver.

    if (
      assetVersion.marketplaceStatus !==
      MarketplacePublishStatus.PENDING_APPROVAL
    ) {
      throw new ForbiddenException(
        'Cannot reject a version that is not pending approval.',
      );
    }

    return this.prisma.promptAssetVersion.update({
      where: { id: assetVersion.id },
      data: {
        marketplaceStatus: MarketplacePublishStatus.REJECTED,
        marketplaceRejectionReason: rejectionReason,
        marketplaceApproverId: approverId,
        marketplaceApprovedAt: null,
        marketplacePublishedAt: null,
      },
    });
  }
}
