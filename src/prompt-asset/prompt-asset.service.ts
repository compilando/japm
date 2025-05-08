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
        const existingAsset = await this.prisma.promptAsset.findUnique({
            where: { projectId_key: { projectId, key } },
        });

        if (existingAsset) {
            throw new ConflictException(`Asset with key "${key}" already exists in project "${projectId}".`);
        }

        let newAsset: PromptAsset;
        let newVersion: PromptAssetVersion;

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                newAsset = await tx.promptAsset.create({
                    data: {
                        key,
                        name,
                        type,
                        description,
                        category,
                        enabled: true,
                        project: { connect: { id: projectId } }
                    },
                });

                newVersion = await tx.promptAssetVersion.create({
                    data: {
                        asset: { connect: { id: newAsset.id } },
                        value: initialValue,
                        changeMessage: initialChangeMessage,
                        versionTag: 'v1.0.0',
                        status: 'active'
                    },
                });
                return { asset: newAsset, version: newVersion };
            });

            return {
                ...result.asset,
                versions: [result.version],
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Project with ID "${projectId}" not found during asset creation.`);
                }
            }
            console.error(`Error creating asset "${key}" in project ${projectId}:`, error);
            throw new Error(`Failed to create asset "${key}" in project ${projectId}.`);
        }
    }

    findAll(projectId: string): Promise<PromptAsset[]> {
        return this.prisma.promptAsset.findMany({
            where: { projectId },
            include: {
                versions: { select: { id: true, versionTag: true, status: true }, orderBy: { createdAt: 'desc' } },
            },
        });
    }

    async findOne(key: string, projectId: string): Promise<PromptAssetWithDetails> {
        const asset = await this.prisma.promptAsset.findUnique({
            where: { projectId_key: { projectId, key } },
            include: {
                versions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        links: { include: { promptVersion: { select: { id: true, versionTag: true, prompt: { select: { name: true, projectId: true } } } } } },
                    }
                },
            }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found in project "${projectId}"`);
        }
        return asset as PromptAssetWithDetails;
    }

    async update(key: string, updateDto: UpdatePromptAssetDto, projectId: string): Promise<PromptAsset> {
        const existingAsset = await this.findAndValidateAsset(key, projectId);

        const { key: dtoKey, projectId: dtoProjectId, ...restData } = updateDto as any;

        const data: Prisma.PromptAssetUpdateInput = { ...restData };

        if (Object.keys(data).length === 0) {
            return existingAsset;
        }

        try {
            return await this.prisma.promptAsset.update({
                where: { id: existingAsset.id },
                data,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAsset with KEY "${key}" (ID: ${existingAsset.id}) not found during update.`);
            }
            console.error(`Error updating asset with key "${key}" (ID: ${existingAsset.id}) in project ${projectId}:`, error);
            throw error;
        }
    }

    async remove(key: string, projectId: string): Promise<PromptAsset> {
        const assetToDelete = await this.findAndValidateAsset(key, projectId);

        try {
            await this.prisma.promptAsset.delete({
                where: { id: assetToDelete.id },
            });
            return assetToDelete;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`PromptAsset with KEY "${key}" (ID: ${assetToDelete.id}) not found during deletion.`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(`Cannot delete asset '${key}' (ID: ${assetToDelete.id}) in project '${projectId}' as it is still referenced.`);
                }
            }
            console.error(`Error deleting asset with key "${key}" (ID: ${assetToDelete.id}) in project ${projectId}:`, error);
            throw error;
        }
    }

    private async findAndValidateAsset(key: string, projectId: string): Promise<PromptAsset> {
        const asset = await this.prisma.promptAsset.findUnique({
            where: { projectId_key: { projectId, key } }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found in project "${projectId}"`);
        }
        return asset;
    }

    // Methods createVersion and addOrUpdateTranslation REMOVED as they belong elsewhere or are handled differently
}
