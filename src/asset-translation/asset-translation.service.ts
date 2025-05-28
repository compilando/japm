import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { getErrorMessage, getErrorStack } from '../common/types/error.types';
import { CreateAssetTranslationDto } from './dto/create-asset-translation.dto';
import { UpdateAssetTranslationDto } from './dto/update-asset-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssetTranslation, PromptAssetVersion } from '@prisma/client';
import { CreateOrUpdateAssetTranslationDto } from './dto/create-or-update-asset-translation.dto';

@Injectable()
export class AssetTranslationService {
  private readonly logger = new Logger(AssetTranslationService.name);

  constructor(private prisma: PrismaService) {}

  // Helper to verify access to the parent asset version
  private async verifyVersionAccess(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
  ): Promise<PromptAssetVersion> {
    // First find the asset by its key and promptId/projectId
    const asset = await this.prisma.promptAsset.findUnique({
      where: {
        prompt_asset_key_unique: { projectId, promptId, key: assetKey },
      },
    });

    if (!asset) {
      throw new NotFoundException(
        `PromptAsset with key "${assetKey}" not found for prompt "${promptId}" in project "${projectId}".`,
      );
    }

    // Then find the version using the asset ID
    const version = await this.prisma.promptAssetVersion.findUnique({
      where: {
        assetId_versionTag: { assetId: asset.id, versionTag: versionTag },
      },
      include: { asset: true },
    });

    if (!version) {
      throw new NotFoundException(
        `PromptAssetVersion with tag "${versionTag}" not found for asset "${assetKey}".`,
      );
    }

    // TODO: Consider if we need to verify that asset.prompt.project.id === projectId
    // This is implicitly handled by the unique key if promptId and projectId are correctly scoped.

    return version;
  }

  async create(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    createDto: CreateAssetTranslationDto,
  ): Promise<AssetTranslation> {
    const version = await this.verifyVersionAccess(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
    const { languageCode, value } = createDto;

    try {
      return await this.prisma.assetTranslation.create({
        data: {
          value,
          languageCode,
          version: { connect: { id: version.id } }, // Connect using the verified version's CUID
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `AssetTranslation for language "${languageCode}" already exists for version "${versionTag}" of asset "${assetKey}".`,
        );
      }
      // P2025 should be caught by verifyVersionAccess
      throw error;
    }
  }

  async findAllForVersion(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
  ): Promise<AssetTranslation[]> {
    const version = await this.verifyVersionAccess(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
    return this.prisma.assetTranslation.findMany({
      where: { versionId: version.id },
    });
  }

  async findOneByLanguage(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    languageCode: string,
  ): Promise<AssetTranslation> {
    const version = await this.verifyVersionAccess(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
    const translation = await this.prisma.assetTranslation.findUnique({
      where: {
        versionId_languageCode: {
          versionId: version.id,
          languageCode: languageCode,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(
        `AssetTranslation for language "${languageCode}" not found for version "${versionTag}" of asset "${assetKey}".`,
      );
    }
    return translation;
  }

  async update(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    languageCode: string,
    updateDto: UpdateAssetTranslationDto,
  ): Promise<AssetTranslation> {
    const existingTranslation = await this.findOneByLanguage(
      projectId,
      promptId,
      assetKey,
      versionTag,
      languageCode,
    );
    // updateDto should only contain value
    const data = updateDto;
    try {
      return await this.prisma.assetTranslation.update({
        where: {
          id: existingTranslation.id, // Use CUID
        },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`AssetTranslation not found for update.`);
      }
      throw error;
    }
  }

  async remove(
    projectId: string,
    promptId: string,
    assetKey: string,
    versionTag: string,
    languageCode: string,
  ): Promise<AssetTranslation> {
    this.logger.log(
      `Attempting to delete asset translation "${languageCode}" for version "${versionTag}" of asset "${assetKey}" in prompt "${promptId}" (project "${projectId}")`,
    );

    let existingTranslation: AssetTranslation;
    try {
      existingTranslation = await this.findOneByLanguage(
        projectId,
        promptId,
        assetKey,
        versionTag,
        languageCode,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Translation already doesn't exist - this is idempotent behavior
        this.logger.log(
          `Asset translation "${languageCode}" not found for version "${versionTag}" of asset "${assetKey}" - already deleted or never existed`,
        );

        // Return a mock translation object to maintain API compatibility
        const mockTranslation: AssetTranslation = {
          id: `deleted-${languageCode}-${versionTag}-${assetKey}-${Date.now()}`,
          versionId: `unknown-version-${Date.now()}`,
          languageCode,
          value: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return mockTranslation; // Return successfully (idempotent)
      }

      this.logger.error(
        `Error finding asset translation "${languageCode}" for deletion: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }

    try {
      const deletedTranslation = await this.prisma.assetTranslation.delete({
        where: {
          id: existingTranslation.id, // Use CUID
        },
      });

      this.logger.log(
        `Successfully deleted asset translation "${languageCode}" (ID: ${existingTranslation.id}) for version "${versionTag}" of asset "${assetKey}"`,
      );
      return deletedTranslation;
    } catch (error) {
      // Handle specific Prisma errors for idempotent behavior
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // Translation was deleted by another process between findOneByLanguage and delete
        this.logger.log(
          `Asset translation "${languageCode}" was already deleted by another process during deletion attempt`,
        );

        // Return the existing translation data (successful idempotent operation)
        return existingTranslation;
      }

      this.logger.error(
        `Failed to delete asset translation "${languageCode}" for version "${versionTag}" of asset "${assetKey}": ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async findAll(): Promise<AssetTranslation[]> {
    return this.prisma.assetTranslation.findMany({
      include: { version: true },
    });
  }

  // Useful method to find translations for a specific version
  findByVersionId(versionId: string): Promise<AssetTranslation[]> {
    return this.prisma.assetTranslation.findMany({
      where: { versionId },
      include: { version: false },
    });
  }

  async findOne(id: string): Promise<AssetTranslation> {
    const translation = await this.prisma.assetTranslation.findUnique({
      where: { id },
      include: { version: { include: { asset: true } } }, // Include version and logical asset
    });
    if (!translation) {
      throw new NotFoundException(`AssetTranslation with ID "${id}" not found`);
    }
    return translation;
  }

  async findOneByVersionAndLanguage(
    versionId: string,
    languageCode: string,
  ): Promise<AssetTranslation | null> {
    return this.prisma.assetTranslation.findUnique({
      where: { versionId_languageCode: { versionId, languageCode } },
      include: { version: false },
    });
  }

  async upsertTranslation(
    versionId: string,
    dto: CreateOrUpdateAssetTranslationDto,
  ): Promise<AssetTranslation> {
    const { languageCode, value } = dto;

    // 1. Verificar que la versión del asset exista
    // Usamos select: { id: true } para eficiencia, solo necesitamos saber si existe
    const versionExists = await this.prisma.promptAssetVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!versionExists) {
      throw new NotFoundException(
        `PromptAssetVersion with ID "${versionId}" not found.`,
      );
    }

    // 2. Crear o actualizar la traducción usando upsert
    try {
      return await this.prisma.assetTranslation.upsert({
        where: {
          versionId_languageCode: { versionId, languageCode },
        },
        update: { value },
        create: { versionId, languageCode, value },
        // include: { version: true } // Podría incluirse si se necesita la versión completa
      });
    } catch (error) {
      // Prisma debería lanzar P2003 si versionId no existe, pero ya lo comprobamos.
      // Prisma should throw P2003 if versionId does not exist, but we already checked it.
      // Other errors could occur.
      console.error(
        `Failed to upsert translation for version ${versionId} and language ${languageCode}:`,
        error,
      );
      throw new Error('Could not save asset translation.');
    }
  }

  async findByVersion(versionId: string): Promise<AssetTranslation[]> {
    // Verificar si la versión existe podría ser útil aquí también
    // Checking if the version exists could also be useful here
    return this.prisma.assetTranslation.findMany({
      where: { versionId },
    });
  }

  async removeTranslation(
    versionId: string,
    languageCode: string,
  ): Promise<AssetTranslation> {
    try {
      return await this.prisma.assetTranslation.delete({
        where: {
          versionId_languageCode: { versionId, languageCode },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Translation for language "${languageCode}" in version "${versionId}" not found.`,
        );
      }
      throw error;
    }
  }
}
