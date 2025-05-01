import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreatePromptAssetDto } from './dto/create-prompt-asset.dto';
import { UpdatePromptAssetDto } from './dto/update-prompt-asset.dto';
import { CreateAssetVersionDto } from '../prompt-asset-version/dto/create-asset-version.dto';
import { CreateOrUpdateAssetTranslationDto } from './dto/create-or-update-asset-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAsset, PromptAssetVersion, AssetTranslation } from '@prisma/client';

// Tipo helper actualizado - Sin activeVersion/activeVersionId directos
export type AssetWithInitialVersion = PromptAsset & {
    versions: PromptAssetVersion[];
};

@Injectable()
export class PromptAssetService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePromptAssetDto): Promise<AssetWithInitialVersion> {
        const { key, name, type, description, category, initialValue, initialChangeMessage, projectId } = createDto;

        // Validar que se proporcionó un valor inicial
        if (initialValue === undefined || initialValue === null) {
            throw new ConflictException('Initial value is required to create the first asset version.');
        }

        // Verificar si el asset key ya existe
        const existingAsset = await this.prisma.promptAsset.findUnique({ where: { key } });
        if (existingAsset) {
            throw new ConflictException(`Asset with key "${key}" already exists.`);
        }
        if (projectId) {
            const projectExists = await this.prisma.project.findUnique({ where: { id: projectId } });
            if (!projectExists) throw new NotFoundException(`Project with ID "${projectId}" not found.`);
        }

        let newAsset: PromptAsset;
        let newVersion: PromptAssetVersion;

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                newAsset = await tx.promptAsset.create({
                    data: {
                        key, name, type, description, category, enabled: true, // Asumir enabled por defecto
                        project: projectId ? { connect: { id: projectId } } : undefined
                    },
                });

                newVersion = await tx.promptAssetVersion.create({
                    data: {
                        assetId: newAsset.key,
                        value: initialValue,
                        changeMessage: initialChangeMessage,
                        versionTag: 'v1.0.0',
                        // status: 'draft' // Status inicial - REVISAR SI SIGUE DANDO ERROR
                    },
                });

                // Ya NO se establece la versión activa aquí - ELIMINADO

                return { asset: newAsset, version: newVersion };
            });

            // Devolver el asset con la versión inicial incluida (sin info de activeVersion)
            return {
                ...result.asset,
                versions: [result.version],
            };
        } catch (error) {
            console.error("Error creating asset with initial version:", error);
            throw new Error(`Failed to create asset "${key}": ${error.message}`);
        }
    }

    findAll(): Promise<PromptAsset[]> {
        return this.prisma.promptAsset.findMany({
            include: {
                versions: { select: { id: true, versionTag: true /*, status: true*/ } }, // Info básica de versiones - REVISAR status
                project: { select: { id: true, name: true } }
            },
        });
    }

    async findOne(key: string): Promise<PromptAsset> { // Considerar un tipo de retorno más detallado
        const asset = await this.prisma.promptAsset.findUnique({
            where: { key },
            include: {
                // Ya NO se incluye activeVersion aquí - ELIMINADO
                versions: { // Incluir historial completo
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        links: { include: { promptVersion: { select: { id: true, versionTag: true, promptId: true } } } },
                        // activeInEnvironments: { select: { id: true, name: true } } // REVISAR SI SIGUE DANDO ERROR
                    }
                },
                project: true
            }
        });
        if (!asset) {
            throw new NotFoundException(`PromptAsset with KEY "${key}" not found`);
        }
        return asset;
    }

    async update(key: string, updateDto: UpdatePromptAssetDto): Promise<PromptAsset> {
        const { projectId, enabled, ...restData } = updateDto;
        const data: Prisma.PromptAssetUpdateInput = { ...restData };

        if (enabled !== undefined) data.enabled = enabled;
        if (projectId !== undefined) {
            if (projectId === null) {
                data.project = { disconnect: true };
            } else {
                const projectExists = await this.prisma.project.findUnique({ where: { id: projectId } });
                if (!projectExists) throw new NotFoundException(`Project with ID "${projectId}" not found.`);
                data.project = { connect: { id: projectId } };
            }
        }

        try {
            return await this.prisma.promptAsset.update({
                where: { key },
                data,
                include: { project: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAsset with KEY "${key}" not found for update.`);
            }
            throw error;
        }
    }

    async remove(key: string): Promise<PromptAsset> {
        console.warn(`Asset remove logic needs refactoring for cascade delete.`);
        // Primero eliminar links que apuntan a versiones de este asset
        const versions = await this.prisma.promptAssetVersion.findMany({ where: { assetId: key }, select: { id: true } });
        const versionIds = versions.map(v => v.id);
        await this.prisma.promptAssetLink.deleteMany({ where: { assetVersionId: { in: versionIds } } });
        // Luego traducciones
        await this.prisma.assetTranslation.deleteMany({ where: { versionId: { in: versionIds } } });
        // Luego versiones
        await this.prisma.promptAssetVersion.deleteMany({ where: { assetId: key } });
        // Finalmente el asset
        try {
            return await this.prisma.promptAsset.delete({
                where: { key },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAsset with KEY "${key}" not found for deletion.`);
            }
            throw error;
        }
    }

    async createVersion(assetKey: string, createVersionDto: CreateAssetVersionDto): Promise<PromptAssetVersion> {
        const { value, versionTag, changeMessage } = createVersionDto;

        // 1. Verificar que el asset padre existe
        const assetExists = await this.prisma.promptAsset.findUnique({ where: { key: assetKey }, select: { key: true } });
        if (!assetExists) {
            throw new NotFoundException(`PromptAsset with KEY "${assetKey}" not found.`);
        }

        // 2. Verificar que la versión no exista ya para este asset
        const versionExists = await this.prisma.promptAssetVersion.findUnique({
            where: { assetId_versionTag: { assetId: assetKey, versionTag } },
        });
        if (versionExists) {
            throw new ConflictException(`Version "${versionTag}" already exists for asset "${assetKey}".`);
        }

        // 3. Crear la nueva versión
        try {
            return this.prisma.promptAssetVersion.create({
                data: {
                    assetId: assetKey,
                    value: createVersionDto.value,
                    versionTag: createVersionDto.versionTag,
                    changeMessage: createVersionDto.changeMessage,
                    // status: 'draft' // Status inicial - REVISAR SI SIGUE DANDO ERROR
                },
                include: { asset: true }
            });
        } catch (error) {
            // ... (manejo de errores) ...
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(`Version "${createVersionDto.versionTag}" already exists for asset "${assetKey}".`);
                } else if (error.code === 'P2025') {
                    throw new NotFoundException(`Asset with KEY "${assetKey}" not found.`);
                }
            }
            throw error;
        }
    }

    async addOrUpdateTranslation(versionId: string, translationDto: CreateOrUpdateAssetTranslationDto): Promise<AssetTranslation> {
        const { languageCode, value } = translationDto;

        // 1. Verificar que la versión padre existe
        const versionExists = await this.prisma.promptAssetVersion.findUnique({ where: { id: versionId }, select: { id: true } });
        if (!versionExists) {
            throw new NotFoundException(`PromptAssetVersion with ID "${versionId}" not found.`);
        }

        // 2. Usar upsert para crear o actualizar la traducción
        try {
            return await this.prisma.assetTranslation.upsert({
                where: {
                    versionId_languageCode: { versionId, languageCode: translationDto.languageCode }
                },
                update: { value: translationDto.value },
                create: {
                    value: translationDto.value,
                    languageCode: translationDto.languageCode,
                    version: { connect: { id: versionId } }
                },
            });
        } catch (error) {
            // ... (manejo de errores) ...
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAssetVersion with ID "${versionId}" not found during translation upsert.`);
            }
            console.error(`Failed to upsert asset translation for version ${versionId}`, error);
            throw new ConflictException(`Failed to upsert asset translation: ${error.message}`);
        }
    }

    // Método activateVersion ELIMINADO

}
