import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptTranslation, Tag, Environment } from '@prisma/client';

// Asumiendo que tenemos acceso a la función slugify (igual que en ProjectService)
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Type for findOne response
type PromptWithRelations = Prisma.PromptGetPayload<{
    include: {
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

// Type for create response
type PromptWithInitialVersionAndTags = Prisma.PromptGetPayload<{
    include: {
        tags: true;
        versions: { include: { translations: true, activeInEnvironments: { select: { id: true, name: true } } } };
    }
}>;

@Injectable()
export class PromptService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePromptDto, projectId: string): Promise<PromptWithInitialVersionAndTags> {
        const { name, description, promptText, initialTranslations, tags: tagNames, ...restData } = createDto;
        const slug = slugify(name);

        let tagsToConnect: Prisma.TagWhereUniqueInput[] | undefined = undefined;
        if (tagNames && tagNames.length > 0) {
            const existingTags = await this.prisma.tag.findMany({
                where: { name: { in: tagNames }, projectId: projectId },
                select: { id: true, name: true }
            });
            if (existingTags.length !== tagNames.length) {
                const foundTagNames = new Set(existingTags.map(t => t.name));
                const missingTags = tagNames.filter(t => !foundTagNames.has(t));
                throw new NotFoundException(`Tags not found in project '${projectId}': ${missingTags.join(', ')}`);
            }
            tagsToConnect = existingTags.map(tag => ({ id: tag.id }));
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.prompt.create({
                    data: {
                        id: slug,
                        name: name,
                        description: description,
                        projectId: projectId,
                        tags: tagsToConnect ? { connect: tagsToConnect } : undefined,
                        ...restData
                    }
                });

                await tx.promptVersion.create({
                    data: {
                        promptId: slug,
                        promptText: promptText,
                        versionTag: 'v1.0.0',
                        changeMessage: 'Initial version created automatically.',
                        translations: initialTranslations && initialTranslations.length > 0 ? {
                            createMany: { data: initialTranslations.map(t => ({ ...t })) }
                        } : undefined,
                    }
                });
            });

            const createdPrompt = await this.prisma.prompt.findUniqueOrThrow({
                where: {
                    prompt_id_project_unique: {
                        id: slug,
                        projectId: projectId
                    }
                },
                include: {
                    tags: true,
                    versions: {
                        where: { versionTag: 'v1.0.0' },
                        include: {
                            translations: true,
                            activeInEnvironments: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            return createdPrompt as PromptWithInitialVersionAndTags;

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Prompt with ID (slug) "${slug}" already exists in project "${projectId}".`);
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Referenced Project (ID: ${projectId}) or Tag not found during prompt creation.`);
            }
            console.error(`Error creating prompt with slug "${slug}":`, error);
            throw error;
        }
    }

    findAll(projectId: string): Promise<Prompt[]> {
        return this.prisma.prompt.findMany({
            where: { projectId },
            include: {
                tags: { select: { name: true } },
                versions: {
                    select: { id: true, versionTag: true },
                    orderBy: { createdAt: 'desc' }
                }
            },
        });
    }

    async findOne(promptIdSlug: string, projectId: string): Promise<PromptWithRelations> {
        const prompt = await this.prisma.prompt.findUnique({
            where: {
                prompt_id_project_unique: {
                    id: promptIdSlug,
                    projectId: projectId
                }
            },
            include: {
                tags: true,
                versions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        activeInEnvironments: { select: { id: true, name: true } }
                    }
                }
            }
        });
        if (!prompt) {
            throw new NotFoundException(`Prompt with ID (slug) "${promptIdSlug}" not found in project "${projectId}".`);
        }
        return prompt as PromptWithRelations;
    }

    async update(promptIdSlug: string, updateDto: UpdatePromptDto, projectId: string): Promise<PromptWithRelations> {
        await this.findOne(promptIdSlug, projectId);

        const { tagIds, description } = updateDto;
        const promptDataToUpdate: Prisma.PromptUpdateInput = {};

        if (description !== undefined) {
            promptDataToUpdate.description = description;
        }

        if (tagIds !== undefined) {
            const tagsInProject = await this.prisma.tag.findMany({
                where: { id: { in: tagIds }, projectId: projectId },
                select: { id: true }
            });
            if (tagsInProject.length !== tagIds.length) {
                const foundTagIds = new Set(tagsInProject.map(t => t.id));
                const missingTagIds = tagIds.filter(id => !foundTagIds.has(id));
                throw new NotFoundException(`Tags with IDs [${missingTagIds.join(', ')}] not found in project '${projectId}'.`);
            }
            promptDataToUpdate.tags = { set: tagIds.map(id => ({ id: id })) };
        }

        if (Object.keys(promptDataToUpdate).length === 0) {
            return this.findOne(promptIdSlug, projectId);
        }

        try {
            await this.prisma.prompt.update({
                where: {
                    prompt_id_project_unique: {
                        id: promptIdSlug,
                        projectId: projectId
                    }
                },
                data: promptDataToUpdate,
            });
            return this.findOne(promptIdSlug, projectId);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Prompt "${promptIdSlug}" or related entity not found during update.`);
            }
            console.error(`Error updating prompt ${promptIdSlug}:`, error);
            throw error;
        }
    }

    async remove(promptIdSlug: string, projectId: string): Promise<Prompt> {
        const promptToDelete = await this.findOne(promptIdSlug, projectId);

        try {
            return await this.prisma.prompt.delete({
                where: {
                    prompt_id_project_unique: {
                        id: promptIdSlug,
                        projectId: projectId
                    }
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Prompt with ID (slug) "${promptIdSlug}" not found.`);
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new ConflictException(`Cannot delete prompt "${promptToDelete.name}" (slug: ${promptIdSlug}) because it is still referenced by other entities (e.g., PromptVersions).`);
            }
            throw error;
        }
    }

    // --- Version and Translation Methods --- //
    // Estos métodos usan el ID CUID de PromptVersion, pero necesitan el promptId (slug) para verificar pertenencia

    async createVersion(promptIdSlug: string, createVersionDto: CreatePromptVersionDto, projectId: string): Promise<PromptVersion> {
        // 1. Validar prompt padre usando slug
        const prompt = await this.findOne(promptIdSlug, projectId);

        // 2. Encontrar la versión más reciente (sin cambios)
        const latestVersion = await this.prisma.promptVersion.findFirst({
            where: { promptId: prompt.id }, // prompt.id es el slug
            orderBy: { createdAt: 'desc' },
            select: { versionTag: true }
        });

        if (!latestVersion) {
            throw new ConflictException(`Cannot create new version for prompt '${prompt.name}' because no initial version was found.`);
        }

        // 3. Calcular el siguiente tag de versión (sin cambios)
        let newVersionTag = 'v1.0.1';
        const currentTag = latestVersion.versionTag;
        const match = currentTag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = parseInt(match[2], 10);
            const patch = parseInt(match[3], 10);
            newVersionTag = `v${major}.${minor}.${patch + 1}`;
        } else {
            throw new BadRequestException(`Could not determine next version tag. Latest tag '${currentTag}' does not follow expected format vX.Y.Z.`);
        }

        // 4. Crear la nueva versión (sin cambios en la lógica interna, promptId es el slug)
        const { promptText, changeMessage } = createVersionDto;
        try {
            return await this.prisma.promptVersion.create({
                data: {
                    promptId: prompt.id, // prompt.id es el slug
                    versionTag: newVersionTag,
                    promptText: promptText,
                    changeMessage,
                },
                include: { translations: true, activeInEnvironments: { select: { id: true, name: true } } }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Failed to create version tag '${newVersionTag}'. It might already exist for prompt '${prompt.name}'.`);
            }
            console.error(`Error creating version '${newVersionTag}' for prompt '${prompt.name}':`, error);
            throw error;
        }
    }

    // MODIFICADO: Verificar pertenencia usando promptId (slug)
    async addOrUpdateTranslation(
        promptVersionIdCuid: string,
        translationDto: CreateOrUpdatePromptTranslationDto,
        projectId: string // Necesitamos projectId aquí
    ): Promise<PromptTranslation> {
        // Obtener versión y verificar pertenencia del prompt padre al proyecto
        const version = await this.prisma.promptVersion.findUnique({
            where: { id: promptVersionIdCuid },
            select: { prompt: { select: { id: true, projectId: true } } } // Obtener promptId (slug) y projectId
        });

        if (!version) {
            throw new NotFoundException(`PromptVersion with ID "${promptVersionIdCuid}" not found.`);
        }
        // Comprobar si el proyecto del prompt padre coincide con el projectId de la ruta
        if (version.prompt.projectId !== projectId) {
            throw new ForbiddenException(`Access denied. PromptVersion "${promptVersionIdCuid}" does not belong to project "${projectId}".`);
        }

        const { languageCode, promptText } = translationDto;
        return this.prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: promptVersionIdCuid, languageCode } },
            update: { promptText },
            create: { versionId: promptVersionIdCuid, languageCode, promptText },
        });
    }
}
