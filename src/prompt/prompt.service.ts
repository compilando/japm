import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

        if (!promptText) {
            throw new BadRequestException('Initial promptText is required.');
        }
        if (!name) {
            throw new BadRequestException('Prompt name is required.');
        }

        // Check if prompt name already exists *in this project*
        const existingPromptName = await this.prisma.prompt.findFirst({
            where: { name, projectId },
            select: { name: true }
        });
        if (existingPromptName) {
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
            // Create the Prompt (@id is name)
            newPrompt = await this.prisma.prompt.create({
                data: {
                    name: name, // This is the @id
                    description: description,
                    projectId: projectId,
                    tacticId: tacticId,
                    tags: tagsToConnect ? { connect: tagsToConnect } : undefined,
                    ...restData
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // P2002 on the primary key (name) - should be caught by initial check, but maybe race condition?
                if (error.code === 'P2002') {
                    throw new ConflictException(`Prompt with name '${name}' already exists (potential race condition).`);
                } else if (error.code === 'P2025') {
                    // Project or Tactic not found
                    throw new NotFoundException(`Referenced Project (ID: ${projectId}) or Tactic (ID: ${tacticId}) not found.`);
                }
            }
            throw error;
        }

        let newVersion: PromptVersion;
        try {
            // Create the initial Version
            newVersion = await this.prisma.promptVersion.create({
                data: {
                    promptId: newPrompt.name, // Connect using the Prompt's @id (name)
                    promptText: promptText,
                    versionTag: 'v1.0.0',
                    changeMessage: 'Initial version created automatically.',
                    translations: initialTranslations && initialTranslations.length > 0 ? {
                        createMany: { data: initialTranslations }
                    } : undefined,
                },
                include: { translations: true }
            });
        } catch (error) {
            console.error(`Failed to create initial version for prompt ${newPrompt.name}`, error);
            // Rollback: Delete the prompt using its @id (name)
            await this.prisma.prompt.delete({ where: { name: newPrompt.name } })
                .catch(delErr => console.error(`Failed to rollback prompt ${newPrompt.name}`, delErr));
            throw new ConflictException(`Failed to create initial version or translations for prompt: ${error.message}`);
        }

        // Fetch the created prompt with its initial version using the @id (name)
        const createdPrompt = await this.prisma.prompt.findUniqueOrThrow({
            where: { name: newPrompt.name },
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

    async findOne(name: string, projectId: string): Promise<PromptWithRelations> {
        // Find by @id (name) and verify projectId
        const prompt = await this.prisma.prompt.findUnique({
            where: { name: name }, // Use @id for the where clause
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
            throw new NotFoundException(`Prompt with NAME "${name}" not found in project "${projectId}"`);
        }
        return prompt as PromptWithRelations;
    }

    async update(name: string, updateDto: UpdatePromptDto, projectId: string): Promise<PromptWithRelations> {
        // 1. Verify the prompt exists in the project
        await this.findOne(name, projectId); // This also checks projectId

        const { tacticId, tagIds, description } = updateDto;
        const data: Prisma.PromptUpdateInput = {};

        if (description !== undefined) {
            data.description = description;
        }
        // Use the FK field name for update
        if (tacticId !== undefined) {
            data.tactic = tacticId ? { connect: { name: tacticId } } : { disconnect: true };
        }
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
            console.warn(`Update called for prompt "${name}" in project "${projectId}" with no data to change.`);
            return this.findOne(name, projectId);
        }

        try {
            // Update using the @id (name)
            await this.prisma.prompt.update({
                where: { name: name },
                data,
            });
            // Refetch to return updated data with relations
            return this.findOne(name, projectId);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to update not found, or related Tactic/Tag not found
                throw new NotFoundException(`Prompt "${name}" or related Tactic/Tag not found during update.`);
            }
            console.error(`Error updating prompt ${name} in project ${projectId}:`, error);
            throw error;
        }
    }

    async remove(name: string, projectId: string): Promise<Prompt> {
        // 1. Verify existence in project
        const promptToDelete = await this.findOne(name, projectId);

        try {
            // Delete using the @id (name)
            await this.prisma.prompt.delete({
                where: { name: name },
            });
            return promptToDelete; // Return the data found before deletion
        } catch (error) {
            console.error(`Error deleting prompt ${name} in project ${projectId}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    // Record to delete not found
                    throw new NotFoundException(`Prompt with NAME "${name}" not found during deletion.`);
                }
                if (error.code === 'P2003') {
                    // Foreign key constraint failed
                    throw new ConflictException(`Cannot delete prompt '${name}' due to existing related data (check relations without Cascade).`);
                }
            }
            throw error;
        }
    }

    // --- Version and Translation Methods --- //

    async createVersion(promptName: string, createVersionDto: CreatePromptVersionDto, projectId: string): Promise<PromptVersion> {
        const { promptText, versionTag, changeMessage, assetLinks } = createVersionDto;

        // 1. Verify parent prompt exists in the project
        const parentPrompt = await this.findOne(promptName, projectId);

        // 2. Check versionTag uniqueness using @@unique([promptId, versionTag])
        // promptId here refers to the Prompt's @id, which is its name
        const existingVersionTag = await this.prisma.promptVersion.findUnique({
            where: { promptId_versionTag: { promptId: parentPrompt.name, versionTag: versionTag } },
            select: { id: true }
        });
        if (existingVersionTag) {
            throw new ConflictException(`Version tag '${versionTag}' already exists for prompt '${promptName}' in project '${projectId}'.`);
        }

        // 3. Validate Assets
        let assetsToConnect: Prisma.PromptAssetLinkCreateManyPromptVersionInput[] = [];
        if (assetLinks && assetLinks.length > 0) {
            const assetVersionIds = assetLinks.map(link => link.assetVersionId);
            const validAssetVersions = await this.prisma.promptAssetVersion.findMany({
                where: {
                    id: { in: assetVersionIds },
                    asset: { projectId: projectId }
                },
                select: { id: true }
            });
            if (validAssetVersions.length !== assetVersionIds.length) {
                const foundIds = new Set(validAssetVersions.map(av => av.id));
                const missingIds = assetVersionIds.filter(id => !foundIds.has(id));
                throw new NotFoundException(`AssetVersions not found or do not belong to project '${projectId}': ${missingIds.join(', ')}`);
            }
            assetsToConnect = assetLinks.map(link => ({ assetVersionId: link.assetVersionId, position: link.position }));
        }

        // 4. Create version
        try {
            return await this.prisma.promptVersion.create({
                data: {
                    promptId: parentPrompt.name, // Use parent prompt's @id (name)
                    promptText,
                    versionTag,
                    changeMessage,
                    assets: assetsToConnect.length > 0 ? { createMany: { data: assetsToConnect } } : undefined,
                },
                include: {
                    translations: true,
                    assets: { include: { assetVersion: true } },
                    activeInEnvironments: { select: { id: true, name: true } }
                }
            });
        } catch (error) {
            console.error(`Error creating version '${versionTag}' for prompt '${promptName}' in project '${projectId}':`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Failed to create version: A related entity (Asset) was not found unexpectedly.`);
            }
            throw error;
        }
    }

    async addOrUpdateTranslation(versionId: string, translationDto: CreateOrUpdatePromptTranslationDto, projectId: string): Promise<PromptTranslation> {
        // Use promptText from DTO
        const { languageCode, promptText } = translationDto;

        // 1. Verify PromptVersion exists and belongs to the project
        const version = await this.prisma.promptVersion.findUnique({
            where: { id: versionId },
            select: { id: true, prompt: { select: { projectId: true } } }
        });
        if (!version) {
            throw new NotFoundException(`PromptVersion with ID '${versionId}' not found.`);
        }
        if (version.prompt.projectId !== projectId) {
            throw new NotFoundException(`PromptVersion with ID '${versionId}' does not belong to project '${projectId}'.`);
        }

        // 2. Upsert translation
        try {
            return await this.prisma.promptTranslation.upsert({
                where: {
                    versionId_languageCode: {
                        versionId: versionId,
                        languageCode: languageCode,
                    },
                },
                update: {
                    promptText: promptText, // Field in schema and DTO is promptText
                },
                create: {
                    versionId: versionId,
                    languageCode: languageCode,
                    promptText: promptText, // Field in schema and DTO is promptText
                },
            });
        } catch (error) {
            console.error(`Error upserting translation (${languageCode}) for version '${versionId}' in project '${projectId}':`, error);
            throw error;
        }
    }
}
