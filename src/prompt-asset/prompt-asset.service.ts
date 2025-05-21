import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePromptAssetDto } from './dto/create-prompt-asset.dto';
import { UpdatePromptAssetDto } from './dto/update-prompt-asset.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAsset, PromptAssetVersion } from '@prisma/client';

// Type helper: Asset with its initial version
export type AssetWithInitialVersion = PromptAsset & {
  versions: PromptAssetVersion[];
};

// Type for findOne response with details
type PromptAssetWithDetails = Prisma.PromptAssetGetPayload<{
  include: {
    prompt: {
      include: {
        project: true;
      };
    };
    versions: {
      orderBy: { createdAt: 'desc' };
      include: {
        translations: true;
        activeInEnvironments: { select: { id: true; name: true } };
      };
    };
  };
}>;

@Injectable()
export class PromptAssetService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreatePromptAssetDto,
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<AssetWithInitialVersion> {
    const { key, name, category, initialValue, initialChangeMessage } =
      createDto;

    if (!promptIdInput || !projectIdInput) {
      throw new BadRequestException(
        'Prompt ID and Prompt Project ID are required to create an asset.',
      );
    }

    // Verificar si ya existe un asset con la misma clave en el prompt
    const existingAsset = await this.prisma.promptAsset.findUnique({
      where: {
        prompt_asset_key_unique: {
          promptId: promptIdInput,
          projectId: projectIdInput,
          key: key,
        },
      },
    });

    if (existingAsset) {
      throw new ConflictException(
        `PromptAsset with key "${key}" already exists in prompt "${promptIdInput}" (project "${projectIdInput}").`,
      );
    }

    // Crear el asset y su primera versión
    try {
      const newAsset = await this.prisma.promptAsset.create({
        data: {
          key,
          promptId: promptIdInput,
          projectId: projectIdInput,
          versions: {
            create: [
              {
                value: initialValue,
                versionTag: '1.0.0',
                status: 'active',
                changeMessage:
                  initialChangeMessage || name || 'Initial version',
              },
            ],
          },
        },
        include: {
          versions: true,
        },
      });
      return newAsset as AssetWithInitialVersion;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Failed to create asset due to a conflict (e.g., key already exists for this prompt, or prompt/project not found): ${error.message}`,
          );
        } else if (error.code === 'P2025') {
          throw new NotFoundException(
            `Could not create asset: The specified prompt (ID: ${promptIdInput}, ProjectID: ${projectIdInput}) was not found, or other required related record is missing.`,
          );
        } else if (error.code === 'P2003') {
          throw new NotFoundException(
            `Could not create asset: The specified prompt (ID: ${promptIdInput}, ProjectID: ${projectIdInput}) does not exist.`,
          );
        }
      }
      console.error(`Failed to create asset: ${error.message}`, error.stack);
      throw new BadRequestException(`Could not create asset: ${error.message}`);
    }
  }

  findAll(
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<PromptAsset[]> {
    return this.prisma.promptAsset.findMany({
      where: {
        promptId: promptIdInput,
        projectId: projectIdInput,
      },
      include: {
        versions: {
          select: { id: true, versionTag: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        key: 'asc', // Opcional: ordenar los assets por clave
      },
    });
  }

  async findOne(
    key: string,
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<PromptAssetWithDetails> {
    const asset = await this.prisma.promptAsset.findUnique({
      where: {
        prompt_asset_key_unique: {
          promptId: promptIdInput,
          projectId: projectIdInput,
          key: key,
        },
      },
      include: {
        prompt: {
          // UPDATED to fetch through prompt
          include: {
            project: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            translations: true,
            activeInEnvironments: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException(
        `PromptAsset with KEY "${key}" not found in prompt "${promptIdInput}" (project "${projectIdInput}")`,
      );
    }
    return asset as PromptAssetWithDetails; // Type assertion should align now
  }

  async update(
    key: string,
    updateDto: UpdatePromptAssetDto,
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<PromptAsset> {
    const existingAsset = await this.findAndValidateAsset(
      key,
      promptIdInput,
      projectIdInput,
    );

    // Explicitly pick only allowed and existing fields for the update
    const dataToUpdate: Prisma.PromptAssetUpdateInput = {};

    if (updateDto.enabled !== undefined) {
      dataToUpdate.enabled = updateDto.enabled;
    }

    // Add other fields from UpdatePromptAssetDto here if they existed and were valid for PromptAsset model
    // e.g., if (updateDto.description !== undefined) dataToUpdate.description = updateDto.description;

    if (Object.keys(dataToUpdate).length === 0) {
      // Nothing to update, return the asset as is.
      return existingAsset;
    }

    try {
      return await this.prisma.promptAsset.update({
        where: {
          id: existingAsset.id, // Assets are updated by their CUID (id)
        },
        data: dataToUpdate, // Use the explicitly constructed dataToUpdate object
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `PromptAsset with KEY "${key}" (ID: ${existingAsset.id}) not found during update in prompt "${promptIdInput}".`,
        );
      }
      console.error(
        `Error updating asset with key "${key}" (ID: ${existingAsset.id}) in prompt ${promptIdInput} (project ${projectIdInput}):`,
        error,
      );
      throw error;
    }
  }

  async remove(
    key: string,
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<PromptAsset> {
    const assetToDelete = await this.findAndValidateAsset(
      key,
      promptIdInput,
      projectIdInput,
    );

    try {
      await this.prisma.promptAsset.delete({
        where: { id: assetToDelete.id }, // Assets are deleted by their CUID (id)
      });
      return assetToDelete;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `PromptAsset with KEY "${key}" (ID: ${assetToDelete.id}) not found during deletion in prompt "${promptIdInput}".`,
          );
        }
        if (error.code === 'P2003') {
          // Foreign key constraint failed
          throw new ConflictException(
            `Cannot delete asset '${key}' (ID: ${assetToDelete.id}) in prompt '${promptIdInput}' as it is still referenced by other entities (e.g., active versions, logs).`,
          );
        }
      }
      console.error(
        `Error deleting asset with key "${key}" (ID: ${assetToDelete.id}) in prompt ${promptIdInput} (project ${projectIdInput}):`,
        error,
      );
      throw error;
    }
  }

  private async findAndValidateAsset(
    key: string,
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<PromptAsset> {
    const asset = await this.prisma.promptAsset.findUnique({
      where: {
        prompt_asset_key_unique: {
          promptId: promptIdInput,
          projectId: projectIdInput,
          key: key,
        },
      },
    });
    if (!asset) {
      throw new NotFoundException(
        `PromptAsset with KEY "${key}" not found in prompt "${promptIdInput}" (project "${projectIdInput}")`,
      );
    }
    return asset;
  }

  // Methods createVersion and addOrUpdateTranslation REMOVED as they belong elsewhere or are handled differently

  async findOneByKey(
    key: string,
    promptIdInput: string,
    projectIdInput: string,
  ): Promise<PromptAssetWithDetails> {
    // This method is essentially the same as findOne now. Consider deprecating or aliasing.
    const asset = await this.prisma.promptAsset.findUnique({
      where: {
        prompt_asset_key_unique: {
          promptId: promptIdInput,
          projectId: projectIdInput,
          key: key,
        },
      },
      include: {
        // Ensure this include matches PromptAssetWithDetails
        prompt: {
          include: {
            project: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            translations: true,
            activeInEnvironments: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException(
        `PromptAsset with KEY "${key}" not found in prompt "${promptIdInput}" (project "${projectIdInput}")`,
      );
    }
    return asset as PromptAssetWithDetails;
  }
}
