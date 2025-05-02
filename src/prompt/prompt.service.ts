import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptTranslation, Tag, Environment } from '@prisma/client';

// Type for findOne response
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

// Type for create response
type PromptWithInitialVersionAndTags = Prisma.PromptGetPayload<{
    include: {
        tactic: true;
        tags: true;
        versions: { include: { translations: true, activeInEnvironments: { select: { id: true, name: true } } } };
    }
}>;

@Injectable()
export class PromptService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePromptDto, projectId: string): Promise<PromptWithInitialVersionAndTags> {
        const { name, description, promptText, initialTranslations, tacticId, tags, ...restData } = createDto;

        if (!promptText || !name) {
            throw new BadRequestException('Prompt name and initial promptText are required.');
        }

        // Check using the new unique constraint
        const existingPrompt = await this.prisma.prompt.findUnique({
            where: { projectId_name: { projectId, name } },
            select: { id: true } // Just need to know if it exists
        });
        if (existingPrompt) {
            throw new ConflictException(`Prompt with name '${name}' already exists in project '${projectId}'.`);
        }

        // Handle Tags
        let tagsToConnect: Prisma.TagWhereUniqueInput[] | undefined = undefined;
        if (tags && tags.length > 0) {
            const existingTags = await this.prisma.tag.findMany({
                where: {
                    name: { in: tags },
                    projectId: projectId
                },
                select: { id: true, name: true }
            });
            if (existingTags.length !== tags.length) {
                const foundTagNames = new Set(existingTags.map(t => t.name));
                const missingTags = tags.filter(t => !foundTagNames.has(t));
                throw new NotFoundException(`Tags not found in project '${projectId}': ${missingTags.join(', ')}`);
            }
            tagsToConnect = existingTags.map(tag => ({ id: tag.id }));
        }

        let newPrompt: Prompt;
        try {
            // Create the Prompt (id is now CUID)
            newPrompt = await this.prisma.prompt.create({
                data: {
                    name: name,
                    description: description,
                    projectId: projectId,
                    tacticId: tacticId,
                    tags: tagsToConnect ? { connect: tagsToConnect } : undefined,
                    ...restData
                },
                // NO Select specific fields, let newPrompt be the full object
            });
        } catch (error) {
            // P2002 can now happen on projectId_name unique constraint
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Prompt with name '${name}' already exists in project '${projectId}'.`);
            }
            // P2025: Referenced Project or Tactic not found
            else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Referenced Project (ID: ${projectId}) or Tactic (ID: ${tacticId}) not found.`);
            }
            throw error;
        }

        let newVersion: PromptVersion;
        try {
            // Create the initial Version connecting via CUID
            newVersion = await this.prisma.promptVersion.create({
                data: {
                    // Connect using the Prompt's CUID (newPrompt.id)
                    promptId: newPrompt.id,
                    promptText: promptText,
                    versionTag: 'v1.0.0',
                    changeMessage: 'Initial version created automatically.',
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations.map(t => ({ ...t })) } // Ensure structure matches Prisma type
                    } : undefined,
                },
                include: { translations: true }
            });
        } catch (error) {
            console.error(`Failed to create initial version for prompt ${newPrompt.name} (ID: ${newPrompt.id})`, error);
            // Rollback: Delete the prompt using its CUID
            await this.prisma.prompt.delete({ where: { id: newPrompt.id } })
                .catch(delErr => console.error(`Failed to rollback prompt ${newPrompt.name}`, delErr));
            throw new ConflictException(`Failed to create initial version or translations for prompt: ${error.message}`);
        }

        // Fetch the created prompt with its initial version using the CUID
        const createdPrompt = await this.prisma.prompt.findUniqueOrThrow({
            where: { id: newPrompt.id },
            include: {
                tactic: true,
                tags: true,
                versions: { where: { id: newVersion.id }, include: { translations: true, activeInEnvironments: { select: { id: true, name: true } } } }
            }
        });

        return createdPrompt as PromptWithInitialVersionAndTags;
    }

    findAll(projectId: string): Promise<Prompt[]> {
        return this.prisma.prompt.findMany({
            where: { projectId },
            include: {
                tactic: { select: { name: true } },
                tags: { select: { name: true } },
                versions: { select: { id: true, versionTag: true }, orderBy: { createdAt: 'desc' } }
            },
        });
    }

    async findOne(promptId: string, projectId: string): Promise<PromptWithRelations> {
        // Find by CUID and verify projectId
        const prompt = await this.prisma.prompt.findUnique({
            where: { id: promptId }, // Use CUID for where clause
            include: {
                tactic: true,
                tags: true, // Tags are implicitly filtered by project if schema is correct
                versions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        translations: true,
                        assets: {
                            orderBy: { position: 'asc' },
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
        // Check if found and if it belongs to the correct project
        if (!prompt || prompt.projectId !== projectId) {
            throw new NotFoundException(`Prompt with ID "${promptId}" not found in project "${projectId}"`);
        }
        return prompt as PromptWithRelations;
    }

    async update(promptId: string, updateDto: UpdatePromptDto, projectId: string): Promise<PromptWithRelations> {
        // 1. Verify the prompt exists in the project (using CUID)
        await this.findOne(promptId, projectId);

        // Solo permitir actualizar description, tacticId, tagIds (NO name)
        const { tacticId, tagIds, description } = updateDto;
        const data: Prisma.PromptUpdateInput = {};

        if (description !== undefined) data.description = description;

        // Tactic update logic
        if (tacticId !== undefined) {
            data.tactic = tacticId ? { connect: { name: tacticId } } : { disconnect: true };
        }
        // Tag update logic
        if (tagIds !== undefined) {
            // Verify tags belong to the project
            const tagsInProject = await this.prisma.tag.findMany({
                where: {
                    id: { in: tagIds },
                    projectId: projectId
                },
                select: { id: true }
            });
            if (tagsInProject.length !== tagIds.length) {
                const foundTagIds = new Set(tagsInProject.map(t => t.id));
                const missingTagIds = tagIds.filter(id => !foundTagIds.has(id));
                throw new NotFoundException(`Tags with IDs [${missingTagIds.join(', ')}] not found in project '${projectId}'.`);
            }
            data.tags = { set: tagIds.map(id => ({ id: id })) };
        }

        if (Object.keys(data).length === 0) {
            console.warn(`Update called for prompt "${promptId}" with no data to change.`);
            return this.findOne(promptId, projectId);
        }

        try {
            // Update using the CUID
            await this.prisma.prompt.update({
                where: { id: promptId },
                data,
            });
            // Refetch to return updated data with relations
            return this.findOne(promptId, projectId);
        } catch (error) {
            // P2025: Record to update/connect not found
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Prompt "${promptId}" or related Tactic/Tag not found during update.`);
            }
            console.error(`Error updating prompt ${promptId}:`, error);
            throw error;
        }
    }

    async remove(promptId: string, projectId: string): Promise<Prompt> {
        // 1. Verify existence in project (using CUID)
        const promptToDelete = await this.findOne(promptId, projectId);

        try {
            // Delete using the CUID
            return await this.prisma.prompt.delete({
                where: { id: promptId },
            });
        } catch (error) {
            // P2025 should be caught by findOne
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Prompt with ID "${promptId}" not found.`);
            }
            // P2003 if related PromptVersions, etc. exist and block delete
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new ConflictException(`Cannot delete prompt "${promptToDelete.name}" (ID: ${promptId}) because it is still referenced by other entities (e.g., PromptVersions).`);
            }
            throw error;
        }
    }

    // --- Version and Translation Methods --- //

    async createVersion(promptId: string, createVersionDto: CreatePromptVersionDto, projectId: string): Promise<PromptVersion> {
        // Verify parent prompt belongs to project using its CUID
        await this.findOne(promptId, projectId);

        const { versionTag, promptText, initialTranslations, changeMessage } = createVersionDto;
        try {
            return await this.prisma.promptVersion.create({
                data: {
                    promptId: promptId, // Connect using CUID
                    versionTag: versionTag || 'v1.0.1', // Example: increment logic might be needed
                    promptText: promptText,
                    changeMessage: changeMessage,
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations.map(t => ({ ...t })) }
                    } : undefined,
                },
                include: { translations: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Version tag "${versionTag || 'v1.0.1'}" already exists for prompt ID "${promptId}".`);
            }
            throw error;
        }
    }

    async addOrUpdateTranslation(versionId: string, translationDto: CreateOrUpdatePromptTranslationDto, projectId: string): Promise<PromptTranslation> {
        // 1. Find the specific prompt version using its CUID
        const version = await this.prisma.promptVersion.findUnique({
            where: { id: versionId }, // Find by CUID
            select: { id: true, prompt: { select: { projectId: true } } }
        });

        if (!version) {
            throw new NotFoundException(`PromptVersion with ID "${versionId}" not found.`);
        }
        // Verify project access: Check if the version's parent prompt belongs to the given projectId
        if (version.prompt.projectId !== projectId) {
            throw new ForbiddenException(`Access denied: PromptVersion "${versionId}" does not belong to project "${projectId}".`);
        }

        const { languageCode, promptText } = translationDto;

        // 2. Upsert using the version CUID (version.id)
        return this.prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: version.id, languageCode } },
            update: { promptText },
            create: { versionId: version.id, languageCode, promptText },
        });
    }

    async findOneByName(name: string, projectId: string): Promise<PromptWithRelations> {
        const prompt = await this.prisma.prompt.findUnique({
            where: { projectId_name: { projectId, name } },
            // ... includes ...
        });
        if (!prompt) {
            throw new NotFoundException(`Prompt with name "${name}" not found in project "${projectId}".`);
        }
        return prompt as PromptWithRelations;
    }
}
