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
        versions: {
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
                },
                activeInEnvironments: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }
    }
}>;

// Tipo extendido para la respuesta de create
type PromptWithInitialVersionAndTags = Prisma.PromptGetPayload<{
    include: {
        tactic: true;
        tags: true;
        versions: { include: { translations: true, activeInEnvironments: { select: { id: true, name: true } } } }; // Incluimos todas las versiones inicialmente (solo será 1)
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

        // 3. ///// Ya NO se marca la versión como activa aquí. Se gestiona con Environments //////
        // const finalPrompt = await this.prisma.prompt.update({
        //     where: { name: newPrompt.name },
        //     data: { activeVersion: { connect: { id: newVersion.id } } },
        //     include: { // Incluir todo lo necesario para el tipo de retorno
        //         tactic: true,
        //         tags: true,
        //         versions: { where: { id: newVersion.id }, include: { translations: true, activeInEnvironments: { select: { id: true, name: true } } } },
        //         // activeVersion: { include: { translations: true } }, // Eliminado
        //     }
        // });

        // Devolvemos el prompt recién creado con su única versión
        const createdPrompt = await this.prisma.prompt.findUniqueOrThrow({
            where: { name: newPrompt.name },
            include: {
                tactic: true,
                tags: true,
                versions: { where: { id: newVersion.id }, include: { translations: true, /*activeInEnvironments: { select: { id: true, name: true } }*/ } }
            }
        });

        return createdPrompt as PromptWithInitialVersionAndTags;
    }

    // Refactorizado para incluir tags
    findAll(): Promise<Prompt[]> { // Devolvemos tipo base, el controlador puede mapear si necesita más
        return this.prisma.prompt.findMany({
            include: {
                tactic: { select: { name: true } }, // Solo nombre de la táctica
                tags: { select: { name: true } }, // Solo nombres de tags
                versions: { select: { id: true, versionTag: true, /* status: true */ } } // Info básica de versiones - REVISAR status
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
                versions: { // Incluir historial completo
                    orderBy: { createdAt: 'desc' },
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
                        },
                        activeInEnvironments: { select: { id: true, name: true } }
                    }
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
        // Extraer explícitamente los campos conocidos del DTO
        const { tacticId, tagIds, description } = updateDto;

        // Construir el objeto de datos para Prisma explícitamente
        let data: Prisma.PromptUpdateInput = {};

        // Añadir campos solo si están definidos en el DTO
        if (description !== undefined) {
            data.description = description;
        }

        if (tacticId !== undefined) {
            data.tactic = tacticId ? { connect: { name: tacticId } } : { disconnect: true };
        }

        if (tagIds !== undefined) {
            // Usar 'set' para reemplazar completamente las relaciones de tags por los IDs proporcionados
            data.tags = {
                set: tagIds.map(id => ({ id: id }))
            };
        }
        // Si tagIds es undefined, no se añade `data.tags`, por lo que Prisma no modifica las etiquetas existentes.

        // Verificar si se proporcionó algún dato para actualizar
        if (Object.keys(data).length === 0) {
            // Si no hay nada que actualizar, podemos devolver el prompt existente para evitar una llamada innecesaria a la BD.
            // Opcionalmente, podrías lanzar un BadRequestException si esperas que siempre haya algo que actualizar.
            console.warn(`Update called for prompt "${name}" with no data to change.`);
            return this.findOne(name);
        }

        try {
            // Actualizamos el prompt con los datos construidos
            await this.prisma.prompt.update({
                where: { name },
                data, // Pasar el objeto 'data' construido explícitamente
            });
            // Devolvemos la entidad actualizada con todas las relaciones
            return this.findOne(name);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    // Puede ser que el prompt no exista, o un tacticId o tagId no exista.
                    throw new NotFoundException(`Prompt with NAME "${name}" not found, or related Tactic/Tag with provided ID could not be found.`);
                }
            }
            // Re-lanzar otros errores inesperados
            console.error(`Error updating prompt ${name}:`, error);
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

    // Refactorizado: Crea una nueva versión, NO la activa
    async createVersion(promptName: string, createVersionDto: CreatePromptVersionDto): Promise<PromptVersion> {
        const { promptText, versionTag, changeMessage, initialTranslations } = createVersionDto;

        // 1. Verificar que el prompt padre existe
        const promptExists = await this.prisma.prompt.findUnique({ where: { name: promptName }, select: { name: true } });
        if (!promptExists) {
            throw new NotFoundException(`Prompt with NAME "${promptName}" not found.`);
        }

        // 2. Verificar que la versión no exista ya para este prompt
        const versionExists = await this.prisma.promptVersion.findUnique({
            where: { promptId_versionTag: { promptId: promptName, versionTag } },
        });
        if (versionExists) {
            throw new ConflictException(`Version "${versionTag}" already exists for prompt "${promptName}".`);
        }

        // 3. Crear la nueva versión con traducciones opcionales
        try {
            return this.prisma.promptVersion.create({
                data: {
                    prompt: { connect: { name: promptName } },
                    promptText,
                    versionTag,
                    changeMessage,
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations }
                    } : undefined,
                },
                include: { translations: true, /* activeInEnvironments: true */ } // Devolver con traducciones y entornos activos - REVISAR status
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Unique constraint failed
                    throw new ConflictException(`Version "${versionTag}" already exists for prompt "${promptName}".`);
                } else if (error.code === 'P2025') { // Referenced record not found
                    throw new NotFoundException(`Prompt with NAME "${promptName}" not found.`);
                }
            }
            console.error(`Failed to create version ${versionTag} for prompt ${promptName}`, error);
            throw new ConflictException(`Failed to create version: ${error.message}`);
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
