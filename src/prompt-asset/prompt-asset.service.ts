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
        project: true,
        versions: {
            orderBy: { createdAt: 'desc' },
            include: {
                translations: true,
                activeInEnvironments: { select: { id: true, name: true } }
            }
        }
    }
}>;

@Injectable()
export class PromptAssetService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePromptAssetDto, projectIdFromRoute?: string): Promise<AssetWithInitialVersion> {
        const { key, name, category, initialValue, initialChangeMessage } = createDto;
        const resolvedProjectId = projectIdFromRoute || createDto.projectId;

        if (!resolvedProjectId) {
            throw new BadRequestException('Project ID is required to create an asset.');
        }

        // Verificar si ya existe un asset con la misma clave en el proyecto
        const existingAsset = await this.prisma.promptAsset.findUnique({
            where: {
                project_asset_key_unique: {
                    projectId: resolvedProjectId,
                    key: key,
                }
            }
        });

        if (existingAsset) {
            throw new ConflictException(`PromptAsset with key "${key}" already exists in project "${resolvedProjectId}".`);
        }

        // Crear el asset y su primera versión
        try {
            const newAsset = await this.prisma.promptAsset.create({
                data: {
                    key,
                    project: { connect: { id: resolvedProjectId } },
                    versions: {
                        create: [
                            {
                                value: initialValue,
                                versionTag: 'v1.0.0', // Versión inicial
                                status: 'active',     // Activa por defecto
                                changeMessage: initialChangeMessage || name || 'Initial version',
                            }
                        ]
                    }
                },
                include: {
                    versions: true // Incluir la versión creada
                }
            });
            return newAsset as AssetWithInitialVersion;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Unique constraint violation
                    throw new ConflictException(`Failed to create asset due to a conflict (e.g., key already exists or project not found): ${error.message}`);
                }
            }
            console.error(`Failed to create asset: ${error.message}`, error.stack);
            throw new BadRequestException(`Could not create asset: ${error.message}`);
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
            where: { project_asset_key_unique: { projectId, key } },
            include: {
                versions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        activeInEnvironments: { select: { id: true, name: true } }
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

        const { key: dtoKey, projectId: dtoProjectId, tenantId: _omitTenantId, ...restData } = updateDto as any;

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
            where: { project_asset_key_unique: { projectId, key } }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found in project "${projectId}"`);
        }
        return asset;
    }

    // Methods createVersion and addOrUpdateTranslation REMOVED as they belong elsewhere or are handled differently

    async findOneByKey(projectId: string, key: string): Promise<PromptAssetWithDetails> {
        const asset = await this.prisma.promptAsset.findUnique({
            where: { project_asset_key_unique: { projectId, key } },
            include: {
                project: true,
                versions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        activeInEnvironments: { select: { id: true, name: true } }
                    }
                }
            }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found in project "${projectId}"`);
        }
        return asset as PromptAssetWithDetails;
    }
}
