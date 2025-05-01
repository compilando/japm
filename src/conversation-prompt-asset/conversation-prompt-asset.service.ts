import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateConversationPromptAssetDto } from './dto/create-conversation-prompt-asset.dto';
import { UpdateConversationPromptAssetDto } from './dto/update-conversation-prompt-asset.dto';
import { CreateAssetVersionDto } from './dto/create-asset-version.dto';
import { CreateOrUpdateAssetTranslationDto } from './dto/create-or-update-asset-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConversationPromptAsset, ConversationPromptAssetVersion, AssetTranslation } from '@prisma/client';

// Tipo para la respuesta de creación, incluyendo la versión inicial
type AssetWithInitialVersion = ConversationPromptAsset & {
    versions: ConversationPromptAssetVersion[];
    activeVersion: ConversationPromptAssetVersion | null;
};

@Injectable()
export class ConversationPromptAssetService {
    constructor(private prisma: PrismaService) { }

    // Refactorizado para crear Asset y su primera Versión
    async create(createDto: CreateConversationPromptAssetDto): Promise<AssetWithInitialVersion> {
        // Asumimos que CreateConversationPromptAssetDto ahora tiene 'value'
        // y opcionalmente 'initialTranslations' array [{ languageCode: string, value: string }]
        const { value, initialTranslations, ...restData } = createDto;

        // Validar que se proporcionó un valor inicial
        if (value === undefined || value === null) {
            throw new ConflictException('Initial value is required to create the first asset version.');
        }

        // 1. Crear el Asset lógico
        let newAsset: ConversationPromptAsset;
        try {
            newAsset = await this.prisma.conversationPromptAsset.create({
                data: { ...restData }, // restData incluye key, name, description, type, etc.
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = (error.meta?.target as string[])?.join(', ');
                throw new ConflictException(`Asset with this ${target} already exists.`);
            }
            throw error;
        }

        // 2. Crear la primera Versión (v1.0.0)
        let newVersion: ConversationPromptAssetVersion;
        try {
            newVersion = await this.prisma.conversationPromptAssetVersion.create({
                data: {
                    value: value, // Valor base inicial
                    versionTag: 'v1.0.0', // O generar de alguna forma
                    changeMessage: 'Initial version created automatically.',
                    asset: { connect: { key: newAsset.key } },
                    // Crear traducciones iniciales si se proporcionan
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: {
                            data: initialTranslations,
                        }
                    } : undefined,
                },
                include: { translations: true } // Incluir traducciones creadas
            });
        } catch (error) {
            // Si falla la creación de la versión, ¿deberíamos borrar el asset lógico creado antes?
            // Por simplicidad, por ahora lanzamos el error.
            console.error(`Failed to create initial version for asset ${newAsset.key}`, error);
            await this.prisma.conversationPromptAsset.delete({ where: { key: newAsset.key } }).catch(delErr => console.error(`Failed to rollback asset ${newAsset.key}`, delErr)); // Rollback
            throw new ConflictException(`Failed to create initial version or translations for asset: ${error.message}`);
        }

        // 3. Marcar la nueva versión como activa
        const updatedAsset = await this.prisma.conversationPromptAsset.update({
            where: { key: newAsset.key },
            data: { activeVersion: { connect: { id: newVersion.id } } },
            include: { // Incluir datos relevantes para la respuesta
                versions: { where: { id: newVersion.id }, include: { translations: true } }, // Solo la versión creada
                activeVersion: { include: { translations: true } }, // La versión activa (que es la misma)
            }
        });

        return updatedAsset as AssetWithInitialVersion; // Devolver el asset con su versión activa
    }

    // Refactorizado para incluir la versión activa y sus detalles
    findAll(): Promise<ConversationPromptAsset[]> {
        return this.prisma.conversationPromptAsset.findMany({
            include: {
                activeVersion: { // Incluir solo la versión activa
                    include: {
                        translations: true // Incluir traducciones de la versión activa
                    }
                }
                // Excluimos 'versions' aquí para no cargar todo el historial por defecto
                // Excluimos 'links' ya que no existe más en este modelo
            },
        });
    }

    // ... (findOne, update, remove necesitan refactorización similar)
    // findOne, update y remove necesitarán ser refactorizados
    async findOne(key: string): Promise<ConversationPromptAsset> {
        const asset = await this.prisma.conversationPromptAsset.findUnique({
            where: { key },
            include: {
                activeVersion: { // Incluir la versión activa
                    include: {
                        translations: true, // Traducciones de la activa
                        // Podríamos incluir los links donde se USA esta versión
                        links: { include: { promptVersion: { select: { id: true, versionTag: true, prompt: { select: { name: true } } } } } }
                    }
                },
                versions: { // Opcional: incluir historial de versiones?
                    where: { assetId: key },
                    orderBy: { createdAt: 'desc' },
                    select: { versionTag: true, createdAt: true, changeMessage: true } // Solo metadata
                }
            }
        });
        if (!asset) {
            throw new NotFoundException(`ConversationPromptAsset with KEY "${key}" not found`);
        }
        // El tipo de retorno puede necesitar ajuste si incluimos más datos
        return asset;
    }

    // TODO: Refactorizar update - Actualizar solo metadatos del asset principal
    // La actualización del 'value' requerirá un endpoint/servicio para crear NUEVAS versiones.
    async update(key: string, updateDto: UpdateConversationPromptAssetDto): Promise<ConversationPromptAsset> {
        console.warn(`Asset update logic needs refactoring. Only updating name/description/type/category for now.`);
        const { key: _, value: __, initialTranslations: ___ } = updateDto as any; // Excluir campos no actualizables aquí
        // Crear un objeto con los campos que sí se pueden actualizar del asset principal
        const updatableData: Partial<UpdateConversationPromptAssetDto> = {};
        if (updateDto.name !== undefined) updatableData.name = updateDto.name;
        if (updateDto.description !== undefined) updatableData.description = updateDto.description;
        if (updateDto.type !== undefined) updatableData.type = updateDto.type;
        if (updateDto.category !== undefined) updatableData.category = updateDto.category;

        try {
            return await this.prisma.conversationPromptAsset.update({
                where: { key },
                data: updatableData, // Solo actualiza name, description, type, category
                include: { activeVersion: true } // Devolver con su versión activa
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationPromptAsset with KEY "${key}" not found for update.`);
            }
            throw error;
        }
    }

    // TODO: Refactorizar remove - Considerar borrado en cascada de versiones/traducciones/links
    async remove(key: string): Promise<ConversationPromptAsset> {
        console.warn(`Asset remove logic needs refactoring for cascade delete.`);
        // Primero eliminar links que apuntan a versiones de este asset
        const versions = await this.prisma.conversationPromptAssetVersion.findMany({ where: { assetId: key }, select: { id: true } });
        const versionIds = versions.map(v => v.id);
        await this.prisma.conversationPromptAssetLink.deleteMany({ where: { assetVersionId: { in: versionIds } } });
        // Luego traducciones
        await this.prisma.assetTranslation.deleteMany({ where: { versionId: { in: versionIds } } });
        // Luego versiones
        await this.prisma.conversationPromptAssetVersion.deleteMany({ where: { assetId: key } });
        // Finalmente el asset
        try {
            return await this.prisma.conversationPromptAsset.delete({
                where: { key },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationPromptAsset with KEY "${key}" not found for deletion.`);
            }
            throw error;
        }
    }

    // --- Gestión de Versiones de Assets ---

    async createVersion(assetKey: string, createVersionDto: CreateAssetVersionDto): Promise<ConversationPromptAssetVersion> {
        const { value, versionTag, changeMessage, initialTranslations } = createVersionDto;

        // 1. Verificar que el asset padre existe
        const assetExists = await this.prisma.conversationPromptAsset.findUnique({ where: { key: assetKey }, select: { key: true } });
        if (!assetExists) {
            throw new NotFoundException(`ConversationPromptAsset with KEY "${assetKey}" not found.`);
        }

        // 2. Crear la nueva versión con traducciones anidadas
        try {
            const newVersion = await this.prisma.conversationPromptAssetVersion.create({
                data: {
                    value,
                    versionTag,
                    changeMessage,
                    asset: { connect: { key: assetKey } },
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations }
                    } : undefined,
                },
                include: { translations: true } // Devolver con traducciones
            });
            return newVersion;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Unique constraint (assetId + versionTag)
                    throw new ConflictException(`Version with tag "${versionTag}" already exists for asset "${assetKey}".`);
                } else if (error.code === 'P2025') { // Relación no encontrada (assetId ?)
                    throw new NotFoundException(`Asset with KEY "${assetKey}" not found during version creation.`);
                }
            }
            console.error(`Failed to create version for asset ${assetKey}`, error);
            throw new ConflictException(`Failed to create asset version: ${error.message}`);
        }
    }

    // --- Gestión de Traducciones de Assets ---

    async addOrUpdateTranslation(versionId: string, translationDto: CreateOrUpdateAssetTranslationDto): Promise<AssetTranslation> {
        const { languageCode, value } = translationDto;

        // 1. Verificar que la versión padre existe
        const versionExists = await this.prisma.conversationPromptAssetVersion.findUnique({ where: { id: versionId }, select: { id: true } });
        if (!versionExists) {
            throw new NotFoundException(`ConversationPromptAssetVersion with ID "${versionId}" not found.`);
        }

        // 2. Usar upsert para crear o actualizar la traducción
        try {
            const translation = await this.prisma.assetTranslation.upsert({
                where: {
                    versionId_languageCode: { versionId, languageCode }
                },
                update: { value },
                create: {
                    value,
                    languageCode,
                    version: { connect: { id: versionId } }
                },
            });
            return translation;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationPromptAssetVersion with ID "${versionId}" not found during translation upsert.`);
            }
            console.error(`Failed to upsert asset translation for version ${versionId}`, error);
            throw new ConflictException(`Failed to upsert asset translation: ${error.message}`);
        }
    }

    // TODO: Método para eliminar una traducción específica?

    // TODO: Método para activar una AssetVersion (similar al de Prompt)
    // async activateVersion(assetId: string, versionId: string): Promise<ConversationPromptAsset> { ... }

    // TODO: Método para desactivar la AssetVersion activa (similar al de Prompt)
    // async deactivate(assetId: string): Promise<ConversationPromptAsset> { ... }

}
