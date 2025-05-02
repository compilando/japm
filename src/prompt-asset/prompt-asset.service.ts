import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
        versions: {
            orderBy: { createdAt: 'desc' },
            include: {
                translations: true,
                links: { include: { promptVersion: { select: { id: true, versionTag: true, prompt: { select: { name: true } } } } } },
            }
        }
    }
}>;

@Injectable()
export class PromptAssetService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePromptAssetDto, projectId: string): Promise<AssetWithInitialVersion> {
        const { key, name, type, description, category, initialValue, initialChangeMessage } = createDto;

        if (initialValue === undefined || initialValue === null) {
            throw new BadRequestException('Initial value is required to create the first asset version.');
        }

        // Check if asset with the same key exists in the project
        const existingAsset = await this.prisma.promptAsset.findFirst({
            where: { key, projectId },
            // select: { id: true } // Remove select, findFirst returns the object or null
        });
        if (existingAsset) {
            throw new ConflictException(`Asset with key "${key}" already exists in project "${projectId}".`);
        }

        let newAsset: PromptAsset;
        let newVersion: PromptAssetVersion;

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                // Create the asset, connect to project
                newAsset = await tx.promptAsset.create({
                    data: {
                        key,
                        name,
                        type,
                        description,
                        category,
                        enabled: true,
                        project: { connect: { id: projectId } }
                        // Use direct projectId assignment if connect fails due to linter issues
                        // projectId: projectId,
                    },
                    // Remove select, prisma returns the created object by default
                    // select: { id: true, key: true, name: true, type: true, description: true, category: true, enabled: true, projectId: true, createdAt: true, updatedAt: true }
                });

                // Create the initial version, connect to the new asset using its key (the @id)
                newVersion = await tx.promptAssetVersion.create({
                    data: {
                        // Connect using the asset's primary key (key)
                        asset: { connect: { key: newAsset.key } },
                        value: initialValue,
                        changeMessage: initialChangeMessage,
                        versionTag: 'v1.0.0',
                    },
                });
                return { asset: newAsset, version: newVersion };
            });
            // Combine asset and its initial version for the response
            return {
                ...result.asset,
                versions: [result.version],
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    // Could be the project not found during asset creation
                    throw new NotFoundException(`Project with ID "${projectId}" not found.`);
                }
                // P2002 on PromptAsset key/projectId handled by initial check
            }
            console.error(`Error creating asset "${key}" in project ${projectId}:`, error);
            throw new Error(`Failed to create asset "${key}" in project ${projectId}: ${error.message}`);
        }
    }

    findAll(projectId: string): Promise<PromptAsset[]> {
        return this.prisma.promptAsset.findMany({
            where: { projectId },
            include: {
                // Optionally include minimal version info
                versions: { select: { id: true, versionTag: true }, orderBy: { createdAt: 'desc' } },
            },
        });
    }

    async findOne(key: string, projectId: string): Promise<PromptAssetWithDetails> {
        const asset = await this.prisma.promptAsset.findFirst({
            where: { key, projectId }, // Find by key within the project
            include: {
                versions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        // Include details about linked prompts
                        links: { include: { promptVersion: { select: { id: true, versionTag: true, prompt: { select: { name: true, projectId: true } } } } } },
                    }
                },
            }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found in project "${projectId}"`);
        }
        // Type assertion might be needed if Prisma can't infer the full type with nested includes
        return asset as PromptAssetWithDetails;
    }

    async update(key: string, updateDto: UpdatePromptAssetDto, projectId: string): Promise<PromptAsset> {
        // 1. Verify asset exists in the project
        const existingAsset = await this.findAndValidateAsset(key, projectId);

        const { enabled, ...restData } = updateDto;
        const data: Prisma.PromptAssetUpdateInput = { ...restData };
        if (enabled !== undefined) data.enabled = enabled;

        if (Object.keys(data).length === 0) {
            console.warn(`Update called for asset "${key}" in project "${projectId}" with no data to change.`);
            return existingAsset;
        }

        try {
            // Update using the unique key (which is the @id)
            return await this.prisma.promptAsset.update({
                where: { key }, // Use the global @id key
                data,
            });
        } catch (error) {
            // P2025: Asset not found (deleted between check and update)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAsset with KEY "${key}" not found during update.`);
            }
            console.error(`Error updating asset "${key}" in project ${projectId}:`, error);
            throw error;
        }
    }

    async remove(key: string, projectId: string): Promise<PromptAsset> {
        // 1. Verify asset exists in the project and get data to return
        const assetToDelete = await this.findAndValidateAsset(key, projectId);

        try {
            // Delete using the unique key (@id)
            await this.prisma.promptAsset.delete({
                where: { key }, // Use the global @id key
            });
            return assetToDelete; // Return the object found before deletion
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`PromptAsset with KEY "${key}" not found during deletion.`);
                }
                if (error.code === 'P2003') {
                    // FK constraint fail (e.g., PromptAssetVersion exists but onDelete not Cascade?)
                    // Check schema: PromptAssetVersion has assetId relation to PromptAsset key - Cascade should handle?
                    throw new ConflictException(`Cannot delete asset '${key}' in project '${projectId}' as it is still referenced. Check schema cascades.`);
                }
            }
            console.error(`Error deleting asset "${key}" in project ${projectId}:`, error);
            throw error;
        }
    }

    // Helper to find asset by key within a project, throws NotFoundException if missing
    private async findAndValidateAsset(key: string, projectId: string): Promise<PromptAsset> {
        const asset = await this.prisma.promptAsset.findFirst({
            where: { key, projectId }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found in project "${projectId}"`);
        }
        return asset;
    }

    // Methods createVersion and addOrUpdateTranslation REMOVED as they belong elsewhere or are handled differently
}
