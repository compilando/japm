import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateAssetTranslationDto } from './dto/create-asset-translation.dto';
import { UpdateAssetTranslationDto } from './dto/update-asset-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssetTranslation, PromptAssetVersion } from '@prisma/client';
import { CreateOrUpdateAssetTranslationDto } from './dto/create-or-update-asset-translation.dto';

@Injectable()
export class AssetTranslationService {
  constructor(private prisma: PrismaService) { }

  // Helper to verify access to the parent asset version
  private async verifyVersionAccess(projectId: string, assetKey: string, versionTag: string): Promise<PromptAssetVersion> {
    const version = await this.prisma.promptAssetVersion.findUnique({
      where: {
        assetId_versionTag: { assetId: assetKey, versionTag: versionTag }
      },
      include: { asset: true }, // Include asset to check projectId
    });

    if (!version) {
      throw new NotFoundException(`PromptAssetVersion with tag "${versionTag}" not found for asset "${assetKey}".`);
    }
    if (version.asset.projectId !== projectId) {
      throw new ForbiddenException(`Access denied to AssetVersion "${versionTag}" for project "${projectId}".`);
    }
    return version; // Return the found version
  }

  async create(projectId: string, assetKey: string, versionTag: string, createDto: CreateAssetTranslationDto): Promise<AssetTranslation> {
    const version = await this.verifyVersionAccess(projectId, assetKey, versionTag);
    const { languageCode, value } = createDto;

    try {
      return await this.prisma.assetTranslation.create({
        data: {
          value,
          languageCode,
          version: { connect: { id: version.id } } // Connect using the verified version's CUID
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`AssetTranslation for language "${languageCode}" already exists for version "${versionTag}" of asset "${assetKey}".`);
      }
      // P2025 should be caught by verifyVersionAccess
      throw error;
    }
  }

  async findAllForVersion(projectId: string, assetKey: string, versionTag: string): Promise<AssetTranslation[]> {
    const version = await this.verifyVersionAccess(projectId, assetKey, versionTag);
    return this.prisma.assetTranslation.findMany({
      where: { versionId: version.id },
    });
  }

  async findOneByLanguage(projectId: string, assetKey: string, versionTag: string, languageCode: string): Promise<AssetTranslation> {
    const version = await this.verifyVersionAccess(projectId, assetKey, versionTag);
    const translation = await this.prisma.assetTranslation.findUnique({
      where: {
        versionId_languageCode: { versionId: version.id, languageCode: languageCode }
      },
    });

    if (!translation) {
      throw new NotFoundException(`AssetTranslation for language "${languageCode}" not found for version "${versionTag}" of asset "${assetKey}".`);
    }
    return translation;
  }

  async update(projectId: string, assetKey: string, versionTag: string, languageCode: string, updateDto: UpdateAssetTranslationDto): Promise<AssetTranslation> {
    const existingTranslation = await this.findOneByLanguage(projectId, assetKey, versionTag, languageCode);
    // updateDto should only contain value
    try {
      return await this.prisma.assetTranslation.update({
        where: {
          id: existingTranslation.id // Use CUID
        },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`AssetTranslation not found for update.`);
      }
      throw error;
    }
  }

  async remove(projectId: string, assetKey: string, versionTag: string, languageCode: string): Promise<AssetTranslation> {
    const existingTranslation = await this.findOneByLanguage(projectId, assetKey, versionTag, languageCode);
    try {
      return await this.prisma.assetTranslation.delete({
        where: {
          id: existingTranslation.id // Use CUID
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`AssetTranslation not found.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<AssetTranslation[]> {
    return this.prisma.assetTranslation.findMany({ include: { version: true } });
  }

  // Método útil para buscar traducciones de una versión específica
  findByVersionId(versionId: string): Promise<AssetTranslation[]> {
    return this.prisma.assetTranslation.findMany({
      where: { versionId },
      include: { version: false }
    });
  }

  async findOne(id: string): Promise<AssetTranslation> {
    const translation = await this.prisma.assetTranslation.findUnique({
      where: { id },
      include: { version: { include: { asset: true } } } // Incluir versión y asset lógico
    });
    if (!translation) {
      throw new NotFoundException(`AssetTranslation with ID "${id}" not found`);
    }
    return translation;
  }

  async findOneByVersionAndLanguage(versionId: string, languageCode: string): Promise<AssetTranslation | null> {
    return this.prisma.assetTranslation.findUnique({
      where: { versionId_languageCode: { versionId, languageCode } },
      include: { version: false }
    });
  }

  async upsertTranslation(versionId: string, dto: CreateOrUpdateAssetTranslationDto): Promise<AssetTranslation> {
    const { languageCode, value } = dto;

    // 1. Verificar que la versión del asset exista
    // Usamos select: { id: true } para eficiencia, solo necesitamos saber si existe
    const versionExists = await this.prisma.promptAssetVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!versionExists) {
      throw new NotFoundException(`PromptAssetVersion with ID "${versionId}" not found.`);
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
      // Otros errores podrían ocurrir.
      console.error(`Failed to upsert translation for version ${versionId} and language ${languageCode}:`, error);
      throw new Error('Could not save asset translation.');
    }
  }

  async findByVersion(versionId: string): Promise<AssetTranslation[]> {
    // Verificar si la versión existe podría ser útil aquí también
    return this.prisma.assetTranslation.findMany({
      where: { versionId },
    });
  }

  async removeTranslation(versionId: string, languageCode: string): Promise<AssetTranslation> {
    try {
      return await this.prisma.assetTranslation.delete({
        where: {
          versionId_languageCode: { versionId, languageCode },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Translation for language "${languageCode}" in version "${versionId}" not found.`);
      }
      throw error;
    }
  }
}
