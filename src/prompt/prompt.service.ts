import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptTranslation, Tag } from '@prisma/client';

// Tipo extendido para la respuesta completa de findOne
type PromptWithRelations = Prisma.PromptGetPayload<{
    include: {
        tactic: true;
        tags: true;
        activeVersion: {
            include: {
                translations: true;
                assets: {
                    include: {
                        assetVersion: {
                            include: {
                                asset: { select: { key: true, name: true } },
                                translations: true
                            }
                        }
                    }
                }
            }
        };
        versions: {
            select: { id: true, versionTag: true, createdAt: true, changeMessage: true }
            orderBy: { createdAt: 'desc' }
        }
    }
}>;

// Tipo extendido para la respuesta de create
type PromptWithInitialVersionAndTags = Prisma.PromptGetPayload<{
    include: {
        tactic: true;
        tags: true;
        versions: { include: { translations: true } }; // Incluimos todas las versiones inicialmente (solo será 1)
        activeVersion: { include: { translations: true } };
    }
}>;

@Injectable()
export class PromptService {
    constructor(private prisma: PrismaService) { }

    // Refactorizado para crear Prompt, su primera Versión y manejar Tags
    async create(createDto: CreatePromptDto): Promise<PromptWithInitialVersionAndTags> {
        const { promptText, initialTranslations, tacticId, tags, ...restData } = createDto;

        if (promptText === undefined || promptText === null) {
            throw new ConflictException('Initial promptText is required to create the first prompt version.');
        }

        // --- Manejo de Tags --- //
        let tagsToConnectOrCreate: Prisma.TagCreateOrConnectWithoutPromptsInput[] | undefined = undefined;
        if (tags && tags.length > 0) {
            tagsToConnectOrCreate = tags.map(tagName => ({
                where: { name: tagName },
                create: { name: tagName }, // Crea el tag si no existe
            }));
        }

        // 1. Crear el Prompt lógico, conectando/creando Tags
        let newPrompt: Prompt;
        try {
            newPrompt = await this.prisma.prompt.create({
                data: {
                    ...restData, // name, description
                    tactic: tacticId ? { connect: { name: tacticId } } : undefined,
                    tags: tagsToConnectOrCreate ? { connectOrCreate: tagsToConnectOrCreate } : undefined,
                },
                // No incluimos relaciones aquí aún, las añadiremos después si es necesario
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const target = (error.meta?.target as string[])?.join(', ');
                    throw new ConflictException(`Prompt or Tag with this ${target} already exists.`);
                } else if (error.code === 'P2025') {
                    throw new NotFoundException(`Referenced tactic with NAME "${tacticId}" not found.`);
                }
            }
            throw error;
        }

        // 2. Crear la primera Versión (v1.0.0)
        let newVersion: PromptVersion;
        try {
            newVersion = await this.prisma.promptVersion.create({
                data: {
                    promptText: promptText,
                    versionTag: 'v1.0.0',
                    changeMessage: 'Initial version created automatically.',
                    prompt: { connect: { name: newPrompt.name } },
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations }
                    } : undefined,
                },
                include: { translations: true }
            });
        } catch (error) {
            console.error(`Failed to create initial version for prompt ${newPrompt.name}`, error);
            // Rollback: Borramos el prompt creado (esto debería borrar en cascada la relación de tags? Revisar schema)
            // Prisma NO borra en cascada relaciones m-m por defecto al borrar un lado.
            // No necesitamos desconectar tags manualmente si borramos el prompt.
            await this.prisma.prompt.delete({ where: { name: newPrompt.name } }).catch(delErr => console.error(`Failed to rollback prompt ${newPrompt.name}`, delErr));
            throw new ConflictException(`Failed to create initial version or translations for prompt: ${error.message}`);
        }

        // 3. Marcar la nueva versión como activa y obtener el resultado final
        const finalPrompt = await this.prisma.prompt.update({
            where: { name: newPrompt.name },
            data: { activeVersion: { connect: { id: newVersion.id } } },
            include: { // Incluir todo lo necesario para el tipo de retorno
                tactic: true,
                tags: true,
                versions: { where: { id: newVersion.id }, include: { translations: true } },
                activeVersion: { include: { translations: true } },
            }
        });

        return finalPrompt as PromptWithInitialVersionAndTags;
    }

    // Refactorizado para incluir tags
    findAll(): Promise<Prompt[]> { // Devolvemos tipo base, el controlador puede mapear si necesita más
        return this.prisma.prompt.findMany({
            include: {
                tactic: { select: { name: true } }, // Solo nombre de la táctica
                tags: { select: { name: true } }, // Solo nombres de tags
                activeVersion: { select: { id: true, versionTag: true } } // Solo ID y tag de la versión activa
            },
        });
    }

    // Refactorizado para incluir tags y detalles completos
    async findOne(name: string): Promise<PromptWithRelations> {
        const prompt = await this.prisma.prompt.findUnique({
            where: { name },
            include: {
                tactic: true,
                tags: true, // Incluir objeto Tag completo
                activeVersion: {
                    include: {
                        translations: true,
                        assets: {
                            orderBy: { position: 'asc' }, // Ordenar assets
                            include: {
                                assetVersion: {
                                    include: {
                                        asset: { select: { key: true, name: true } },
                                        translations: true
                                    }
                                }
                            }
                        }
                    }
                },
                versions: { // Incluir historial completo
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, versionTag: true, createdAt: true, changeMessage: true } // Solo metadata
                }
            }
        });
        if (!prompt) {
            throw new NotFoundException(`Prompt with NAME "${name}" not found`);
        }
        return prompt as PromptWithRelations;
    }

    // Refactorizado: Actualiza metadatos del Prompt (desc, tactic, tags)
    async update(name: string, updateDto: UpdatePromptDto): Promise<PromptWithRelations> {
        const { tacticId, tags, ...restData } = updateDto;

        let data: Prisma.PromptUpdateInput = { ...restData }; // description

        if (tacticId !== undefined) {
            data.tactic = tacticId ? { connect: { name: tacticId } } : { disconnect: true };
        }

        // --- Manejo de Tags --- //
        if (tags !== undefined) {
            if (tags === null || tags.length === 0) {
                data.tags = { set: [] }; // Desconectar todos
            } else {
                const tagsToConnectOrCreate = tags.map(tagName => ({
                    where: { name: tagName },
                    create: { name: tagName },
                }));
                data.tags = { set: [], connectOrCreate: tagsToConnectOrCreate }; // Reemplazar con la nueva lista
            }
        }

        try {
            // Actualizamos primero
            await this.prisma.prompt.update({
                where: { name },
                data,
            });
            // Luego hacemos findOne para devolver la estructura completa actualizada
            return this.findOne(name);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    // Este error puede ocurrir si el prompt no existe, o si un Tactic/Tag referenciado en connectOrCreate no se encuentra (aunque create debería prevenirlo)
                    throw new NotFoundException(`Prompt with NAME "${name}" not found, or related Tactic/Tag could not be connected/found.`);
                } else if (error.code === 'P2002') {
                    // Este error podría ocurrir si se intenta crear un tag con un nombre que ya existe durante el connectOrCreate.
                    const target = (error.meta?.target as string[])?.join(', ');
                    throw new ConflictException(`A tag with name in [${target}] might already exist unexpectedly.`);
                }
            }
            throw error;
        }
    }

    // Refactorizado: Elimina prompt y sus dependencias
    async remove(name: string): Promise<Prompt> {
        // Desconectar tags explícitamente ANTES de borrar el prompt
        // Usamos una transacción para asegurar que ambas operaciones (desconexión y borrado) ocurran
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 1. Desconectar tags (si existen)
                await tx.prompt.update({
                    where: { name },
                    data: { tags: { set: [] } },
                    select: { name: true } // Seleccionar algo mínimo
                }).catch(e => {
                    // Ignorar error si el prompt ya no existe (P2025)
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                        console.warn(`Prompt ${name} likely already deleted before disconnecting tags.`);
                        return null;
                    }
                    throw e; // Re-lanzar otros errores
                });

                // 2. Encontrar y borrar versiones y sus dependencias
                const versions = await tx.promptVersion.findMany({ where: { promptId: name }, select: { id: true } });
                if (versions.length > 0) {
                    const versionIds = versions.map(v => v.id);
                    await tx.promptAssetLink.deleteMany({ where: { promptVersionId: { in: versionIds } } });
                    await tx.promptTranslation.deleteMany({ where: { versionId: { in: versionIds } } });
                    await tx.promptVersion.deleteMany({ where: { promptId: name } });
                }

                // 3. Finalmente, borrar el prompt
                const deletedPrompt = await tx.prompt.delete({
                    where: { name },
                });
                return deletedPrompt;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Si el error P2025 ocurre aquí, significa que el prompt no se encontró para el delete final
                throw new NotFoundException(`Prompt with NAME "${name}" not found for deletion.`);
            }
            // Capturar otros posibles errores de la transacción
            console.error(`Error during transaction for removing prompt ${name}:`, error);
            throw error;
        }
    }

    // --- Gestión de Versiones (sin cambios directos por tags) ---
    async createVersion(promptName: string, createVersionDto: CreatePromptVersionDto): Promise<PromptVersion> {
        const { promptText, versionTag, changeMessage, assetLinks, initialTranslations } = createVersionDto;

        const promptExists = await this.prisma.prompt.findUnique({ where: { name: promptName }, select: { name: true } });
        if (!promptExists) {
            throw new NotFoundException(`Prompt with NAME "${promptName}" not found.`);
        }

        try {
            const newVersion = await this.prisma.promptVersion.create({
                data: {
                    promptText,
                    versionTag,
                    changeMessage,
                    prompt: { connect: { name: promptName } },
                    assets: assetLinks && assetLinks.length > 0 ? {
                        create: assetLinks.map(link => ({
                            position: link.position,
                            usageContext: link.usageContext,
                            assetVersion: { connect: { id: link.assetVersionId } }
                        }))
                    } : undefined,
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations }
                    } : undefined,
                },
                include: {
                    assets: { include: { assetVersion: { select: { id: true, versionTag: true, asset: { select: { key: true } } } } } },
                    translations: true,
                }
            });
            return newVersion;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(`Version with tag "${versionTag}" already exists for prompt "${promptName}".`);
                } else if (error.code === 'P2025') {
                    // Puede ocurrir si un assetVersionId no existe
                    throw new NotFoundException(`One or more specified AssetVersion IDs in assetLinks not found, or the base prompt ${promptName} was deleted mid-operation.`);
                }
            }
            console.error(`Failed to create version for prompt ${promptName}`, error);
            throw new ConflictException(`Failed to create version: ${error.message}`);
        }
    }

    // --- Activar/Desactivar Versión (sin cambios directos por tags) ---
    async activateVersion(promptName: string, versionId: string): Promise<PromptWithRelations> {
        const versionExists = await this.prisma.promptVersion.findUnique({
            where: { id: versionId, promptId: promptName }
        });
        if (!versionExists) {
            throw new NotFoundException(`Version with ID "${versionId}" not found for Prompt "${promptName}"`);
        }

        try {
            await this.prisma.prompt.update({
                where: { name: promptName },
                data: { activeVersion: { connect: { id: versionId } } },
            });
            return this.findOne(promptName);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Prompt with NAME "${promptName}" not found.`);
            }
            throw error;
        }
    }

    async deactivate(promptName: string): Promise<PromptWithRelations> {
        try {
            await this.prisma.prompt.update({
                where: { name: promptName },
                data: { activeVersion: { disconnect: true } },
            });
            return this.findOne(promptName);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Prompt with NAME "${promptName}" not found.`);
            }
            throw error;
        }
    }

    // --- Gestión de Traducciones (sin cambios directos por tags) ---
    async addOrUpdateTranslation(versionId: string, translationDto: CreateOrUpdatePromptTranslationDto): Promise<PromptTranslation> {
        const { languageCode, promptText } = translationDto;
        const versionExists = await this.prisma.promptVersion.findUnique({ where: { id: versionId }, select: { id: true } });
        if (!versionExists) {
            throw new NotFoundException(`PromptVersion with ID "${versionId}" not found.`);
        }
        try {
            const translation = await this.prisma.promptTranslation.upsert({
                where: { versionId_languageCode: { versionId, languageCode } },
                update: { promptText },
                create: { promptText, languageCode, version: { connect: { id: versionId } } },
            });
            return translation;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptVersion with ID "${versionId}" not found during translation upsert.`);
            }
            console.error(`Failed to upsert translation for version ${versionId}`, error);
            throw new ConflictException(`Failed to upsert translation: ${error.message}`);
        }
    }
}
