import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger, InternalServerErrorException } from '@nestjs/common';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptTranslation, Tag, Environment } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ProjectService } from '../project/project.service';
import { SystemPromptService } from '../system-prompt/system-prompt.service';
import { ChatOpenAI } from "@langchain/openai";
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { RawExecutionService } from '../raw-execution/raw-execution.service';
import { ExecuteRawDto } from '../raw-execution/dto/execute-raw.dto';

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
    private readonly logger = new Logger(PromptService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private projectService: ProjectService,
        private systemPromptService: SystemPromptService,
        private rawExecutionService: RawExecutionService,
    ) { }

    // Helper to substitute variables (copied from RawExecutionService for now)
    private substituteVariables(text: string, variables?: Record<string, any>): string {
        if (!variables) return text;
        return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => { // Use {{key}} format
            const value = variables[key.trim()];
            return value !== undefined ? String(value) : match; // Ensure value is string
        });
    }

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

    /**
     * Generates a suggested prompt structure using an LLM via RawExecutionService.
     * @param projectId The CUID of the project to get regions from.
     * @param userPrompt The user's initial prompt text.
     * @param tenantId The CUID of the tenant (obtained from JWT).
     * @param aiModelId The CUID of the AIModel to use (defaults to a placeholder).
     * @returns A JSON object representing the suggested structure.
     */
    async generateStructure(
        projectId: string,
        userPrompt: string,
        tenantId: string,
        aiModelId: string = 'PLEASE_REPLACE_WITH_VALID_MODEL_ID',
    ): Promise<object> {
        this.logger.debug(`Starting generateStructure for projectId: ${projectId}`);

        // 1. Get project regions (needed for the system prompt)
        // Ensure findOneById includes regions or fetch separately
        const project = await this.projectService.findOne(projectId, tenantId);
        if (!project || !project.regions) {
            this.logger.error(`Project or project regions not found for projectId: ${projectId}`);
            throw new NotFoundException(`Project with ID \"${projectId}\" or its regions not found.`);
        }
        const regionsJson = JSON.stringify(project.regions.map(r => ({ languageCode: r.languageCode, name: r.name })));
        this.logger.debug(`Project regions for system prompt: ${regionsJson}`);

        // 2. Prepare DTO for RawExecutionService
        const systemPromptName = 'prompt-generator'; // Use the registered name
        const executeDto: ExecuteRawDto = {
            userText: userPrompt,
            systemPromptName: systemPromptName,
            aiModelId: aiModelId, // Use the provided or default model ID
            variables: {
                "project_regions_json": regionsJson
                // Add any other variables your prompt-generator.md might expect
            }
        };

        this.logger.log(`Calling RawExecutionService.executeRaw with DTO: ${JSON.stringify(executeDto, null, 2)}`);

        // 3. Call RawExecutionService
        let rawOutput: { response: string };
        try {
            rawOutput = await this.rawExecutionService.executeRaw(executeDto);
            this.logger.debug(`Raw response received from RawExecutionService: ${rawOutput.response}`);
        } catch (error) {
            this.logger.error(`Error calling RawExecutionService: ${error.message}`, error.stack);
            // Re-throw or handle specific errors from executeRaw (e.g., model not found, API key error)
            if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error; // Re-throw known error types
            }
            throw new InternalServerErrorException(`Failed to generate structure due to LLM execution error: ${error.message}`);
        }

        // 4. Parse the raw response as JSON
        try {
            // Basic cleaning attempt: remove ```json ... ``` markers if present
            const cleanedResponse = rawOutput.response
                .replace(/^```json\s*/, '')
                .replace(/\s*```$/, '')
                .trim();

            const jsonStructure = JSON.parse(cleanedResponse);
            this.logger.log(`Successfully parsed JSON structure from LLM response.`);
            return jsonStructure;
        } catch (parseError) {
            this.logger.error(`Failed to parse JSON structure from LLM response: ${parseError.message}. Raw response was: ${rawOutput.response}`, parseError.stack);
            throw new InternalServerErrorException('Failed to generate structure: LLM did not return valid JSON.');
        }
    }
}
