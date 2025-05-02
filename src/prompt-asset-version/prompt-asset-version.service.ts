import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAssetVersion, PromptAsset } from '@prisma/client';

@Injectable()
export class PromptAssetVersionService {
  constructor(private prisma: PrismaService) { }

  // Helper to verify asset access
  private async verifyAssetAccess(projectId: string, assetKey: string): Promise<PromptAsset> {
    const asset = await this.prisma.promptAsset.findUnique({
      where: { key: assetKey },
    });
    if (!asset) {
      throw new NotFoundException(`PromptAsset with key "${assetKey}" not found.`);
    }
    if (asset.projectId !== projectId) {
      throw new ForbiddenException(`Access denied to PromptAsset "${assetKey}" for project "${projectId}".`);
    }
    return asset;
  }

  async create(projectId: string, assetKey: string, createDto: CreatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    await this.verifyAssetAccess(projectId, assetKey); // Ensure asset exists in project

    // Excluir assetId si está presente en el DTO (aunque no debería)
    const { assetId: _a, versionTag, ...versionData } = createDto;

    try {
      return await this.prisma.promptAssetVersion.create({
        data: {
          ...versionData, // value, changeMessage, status?
          versionTag: versionTag || 'v1.0.0',
          asset: { connect: { key: assetKey } }, // Connect using assetKey
        },
        include: { asset: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Unique constraint violation (assetId + versionTag)
        throw new ConflictException(`Version tag "${versionTag || 'v1.0.0'}" already exists for asset "${assetKey}".`);
      }
      // P2025 should be caught by verifyAssetAccess
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Asset with key "${assetKey}" not found when creating version.`);
      }
      throw error;
    }
  }

  async findAllForAsset(projectId: string, assetKey: string): Promise<PromptAssetVersion[]> {
    await this.verifyAssetAccess(projectId, assetKey);
    return this.prisma.promptAssetVersion.findMany({
      where: { assetId: assetKey }, // Filter by assetKey
      orderBy: { createdAt: 'desc' },
      include: { translations: true }, // Optional includes
    });
  }

  async findOneByTag(projectId: string, assetKey: string, versionTag: string): Promise<PromptAssetVersion> {
    await this.verifyAssetAccess(projectId, assetKey);
    const version = await this.prisma.promptAssetVersion.findUnique({
      where: {
        assetId_versionTag: { assetId: assetKey, versionTag: versionTag } // Use composite key
      },
      include: {
        asset: true,
        translations: true,
        links: { include: { promptVersion: { include: { prompt: true } } } } // Deep include if needed
      },
    });

    if (!version) {
      throw new NotFoundException(`PromptAssetVersion with tag "${versionTag}" not found for asset "${assetKey}".`);
    }
    // Double check project match via asset
    if (version.asset.projectId !== projectId) {
      throw new ForbiddenException(`AssetVersion ${versionTag} does not belong to project ${projectId}`);
    }
    return version;
  }

  async update(projectId: string, assetKey: string, versionTag: string, updateDto: UpdatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    const existingVersion = await this.findOneByTag(projectId, assetKey, versionTag);
    // Usar updateDto directamente
    try {
      return await this.prisma.promptAssetVersion.update({
        where: {
          id: existingVersion.id // Use CUID
        },
        data: updateDto, // Only update allowed fields (value, changeMessage, status)
        include: { asset: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptAssetVersion not found for update.`);
      }
      throw error;
    }
  }

  async remove(projectId: string, assetKey: string, versionTag: string): Promise<PromptAssetVersion> {
    const existingVersion = await this.findOneByTag(projectId, assetKey, versionTag);
    // TODO: Add logic? Prevent deleting active versions?
    try {
      return await this.prisma.promptAssetVersion.delete({
        where: {
          id: existingVersion.id // Use CUID
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptAssetVersion not found.`);
      }
      // P2003 if translations/links exist
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(`Cannot delete AssetVersion "${versionTag}" because it is still referenced by other entities (e.g., translations, links).`);
      }
      throw error;
    }
  }

  // Remove or comment out old methods
  // findAll(): Promise<PromptAssetVersion[]> { ... }
  // findOne(id: string): Promise<PromptAssetVersion> { ... }
  // findByAssetId(assetId: string): Promise<PromptAssetVersion[]> { ... }
}
