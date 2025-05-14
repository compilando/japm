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
import { LoadPromptStructureDto } from './dto/load-prompt-structure.dto';

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
     * @param userOriginalPrompt The user's initial prompt text.
     * @param tenantId The CUID of the tenant (obtained from JWT).
     * @param targetAiModelApiIdentifier The CUID of the AIModel to use (defaults to a placeholder).
     * @returns A JSON object representing the suggested structure.
     */
    async generateStructure(
        projectId: string,
        userOriginalPrompt: string,
        tenantId: string,
        targetAiModelApiIdentifier: string = 'gpt-4o',
    ): Promise<object> {
        this.logger.debug(
            `Starting generateStructure for projectId: ${projectId}, tenantId: ${tenantId}, targetModel: ${targetAiModelApiIdentifier}`,
        );

        // 1. Obtener información del proyecto actual y sus regiones para el contexto
        const project = await this.projectService.findOne(projectId, tenantId);
        if (!project || !project.regions) {
            this.logger.error(`Project or project regions not found for projectId: ${projectId}`);
            throw new NotFoundException(`Project with ID "${projectId}" or its regions not found.`);
        }
        const projectRegionsJson = JSON.stringify(
            project.regions.map(r => ({ languageCode: r.languageCode, name: r.name }))
        );
        this.logger.debug(`Project regions for system prompt: ${projectRegionsJson}`);

        // 2. Buscar el AIModel por su apiIdentifier (o nombre) DENTRO DE 'default-project'
        const defaultProjectId = 'default-project'; // ID del proyecto donde residen los modelos globales
        const aiModel = await this.prisma.aIModel.findFirst({
            where: {
                projectId: defaultProjectId, // Siempre buscar en 'default-project'
                OR: [
                    { apiIdentifier: targetAiModelApiIdentifier },
                    { name: targetAiModelApiIdentifier }
                ]
            },
        });

        if (!aiModel) {
            this.logger.error(`AI Model with identifier "${targetAiModelApiIdentifier}" not found in project "${defaultProjectId}".`);
            throw new NotFoundException(
                `AI Model with identifier "${targetAiModelApiIdentifier}" not found in the default project context.`,
            );
        }
        this.logger.log(`Found AI Model: ${aiModel.name} (ID: ${aiModel.id} from project ${defaultProjectId}) to be used.`);

        // 3. Definir el userText para RawExecutionService
        const instructionForLLM = `Analyze the following user's request and propose a structured JSON output for a new prompt. The user's original request is: "${userOriginalPrompt}"`;

        const dto: ExecuteRawDto = {
            userText: instructionForLLM,
            systemPromptName: 'prompt-generator',
            aiModelId: aiModel.id,
            variables: {
                project_regions_json: projectRegionsJson,
                user_original_prompt: userOriginalPrompt
            },
        };

        this.logger.log(`Calling RawExecutionService.executeRaw with DTO: ${JSON.stringify(dto)}`);

        try {
            const rawResponse = await this.rawExecutionService.executeRaw(dto);
            this.logger.debug(`Raw response from RawExecutionService: ${JSON.stringify(rawResponse)}`);

            // Intentar parsear la respuesta como JSON.
            try {
                // Limpiar el string de respuesta de posibles marcadores de bloque de código Markdown
                const cleanedResponseString = rawResponse.response
                    .replace(/^\s*```json\s*/im, '') // Elimina ```json al inicio (case-insensitive, multiline)
                    .replace(/\s*```\s*$/im, '')    // Elimina ``` al final (case-insensitive, multiline)
                    .trim();                        // Elimina espacios en blanco al inicio/final

                if (!cleanedResponseString) {
                    this.logger.error('LLM response was empty after cleaning Markdown markers.');
                    throw new InternalServerErrorException('AI response was empty or contained only Markdown markers.');
                }
                
                this.logger.debug(`Cleaned response string for JSON parsing: ${cleanedResponseString}`);
                const structuredResponse = JSON.parse(cleanedResponseString);
                this.logger.log('Successfully parsed LLM response as JSON.');
                return structuredResponse;
            } catch (parseError) {
                this.logger.error(
                    `Failed to parse response from LLM as JSON. Raw response: ${rawResponse.response}`,
                    parseError.stack,
                );
                throw new InternalServerErrorException(
                    'Failed to parse the structure generated by the AI. The response was not valid JSON.',
                );
            }
        } catch (error) {
            if (error.status && error.response) {
                 this.logger.error(`Error from RawExecutionService: ${error.message}`, error.stack);
                 throw error;
            }
            this.logger.error(`Error calling RawExecutionService: ${error.message}`, error.stack);
            throw new InternalServerErrorException(
                `An unexpected error occurred while generating the prompt structure: ${error.message}`,
            );
        }
    }

    async loadStructure(
        projectId: string,
        tenantId: string, // Asegúrate de que este tenantId se use si es necesario para validar el proyecto, o si las entidades lo requieren.
        dto: LoadPromptStructureDto,
    ): Promise<Prompt> { // Considera devolver un DTO más específico si es necesario, o el Prompt con ciertas relaciones.
        this.logger.log(`Attempting to load prompt structure for project: ${projectId} with DTO: ${JSON.stringify(dto)}`);

        const { prompt: promptMeta, version: versionData, assets: assetEntries, tags: tagNames } = dto;

        const promptSlug = slugify(promptMeta.name);

        return this.prisma.$transaction(async (tx) => {
            // 1. Opcional: Verificar que el proyecto existe y pertenece al tenant si es necesario.
            // Por ahora, asumimos que projectId es válido y accesible.
            // const project = await this.projectService.findOne(projectId, tenantId); // Podría lanzar NotFoundException
            // if (!project) throw new NotFoundException(`Project with ID "${projectId}" not found.`);

            // 2. Crear Prompt
            let prompt = await tx.prompt.findUnique({
                where: { prompt_id_project_unique: { id: promptSlug, projectId } },
            });

            if (prompt) {
                throw new ConflictException(
                    `Prompt with name (slug: "${promptSlug}") already exists in project "${projectId}".`,
                );
            }

            prompt = await tx.prompt.create({
                data: {
                    id: promptSlug,
                    name: promptMeta.name,
                    description: promptMeta.description,
                    projectId: projectId,
                },
            });
            this.logger.debug(`Created Prompt: ${prompt.name} (ID: ${prompt.id})`);

            // 3. Crear Assets, sus Versiones y Traducciones de Assets
            const createdAssetsData = new Map<string, { cuid: string; name: string; value: string }>();

            if (assetEntries && assetEntries.length > 0) {
                for (const assetEntry of assetEntries) {
                    const existingAsset = await tx.promptAsset.findUnique({
                        where: { project_asset_key_unique: { projectId, key: assetEntry.key } }
                    });
                    if (existingAsset) {
                        throw new ConflictException(`Asset with key "${assetEntry.key}" already exists in project "${projectId}".`);
                    }

                    const newDbAsset = await tx.promptAsset.create({
                        data: {
                            projectId: projectId,
                            key: assetEntry.key,
                            // name: assetEntry.name, // Asegúrate que tu schema.prisma.PromptAsset tenga 'name' si lo quieres guardar.
                                                    // El schema actual no lo tiene, así que lo omito por ahora.
                                                    // Si lo añades al schema, descomenta esta línea.
                        },
                    });
                    this.logger.debug(`Created PromptAsset: ${newDbAsset.key} (ID: ${newDbAsset.id})`);

                    const newDbAssetVersion = await tx.promptAssetVersion.create({
                        data: {
                            assetId: newDbAsset.id,
                            value: assetEntry.value,
                            changeMessage: assetEntry.changeMessage || 'Initial version from loaded structure.',
                            status: 'active',
                            versionTag: 'v1.0.0', // O una lógica para el tag de versión
                        },
                    });
                    this.logger.debug(`Created PromptAssetVersion for asset: ${newDbAsset.key}`);

                    if (assetEntry.translations && assetEntry.translations.length > 0) {
                        await tx.assetTranslation.createMany({
                            data: assetEntry.translations.map(t => ({
                                versionId: newDbAssetVersion.id,
                                languageCode: t.languageCode,
                                value: t.value,
                            })),
                        });
                        this.logger.debug(`Created ${assetEntry.translations.length} translations for asset version: ${newDbAsset.key}`);
                    }
                    createdAssetsData.set(newDbAsset.key, { cuid: newDbAsset.id, name: assetEntry.name, value: assetEntry.value });
                }
            }
            
            // Validar que todos los assets en versionData.assets fueron definidos en assetEntries
            if (versionData.assets && versionData.assets.length > 0) {
                for (const assetKey of versionData.assets) {
                    if (!createdAssetsData.has(assetKey)) {
                        throw new BadRequestException(`Asset with key "${assetKey}" was listed in version.assets but not defined in the main assets list.`);
                    }
                }
            }

            // 4. Crear PromptVersion
            const newDbPromptVersion = await tx.promptVersion.create({
                data: {
                    promptId: prompt.id, // slug del prompt padre
                    promptText: versionData.promptText,
                    changeMessage: versionData.changeMessage || 'Initial version from loaded structure.',
                    versionTag: 'v1.0.0',
                    status: 'active',
                    // No hay conexión directa a PromptAsset en PromptVersion según el schema actual
                },
            });
            this.logger.debug(`Created PromptVersion (ID: ${newDbPromptVersion.id}) for prompt: ${prompt.name}`);

            // 5. Crear PromptTranslations para la PromptVersion
            if (versionData.translations && versionData.translations.length > 0) {
                await tx.promptTranslation.createMany({
                    data: versionData.translations.map(t => ({
                        versionId: newDbPromptVersion.id,
                        languageCode: t.languageCode,
                        promptText: t.promptText,
                    })),
                });
                this.logger.debug(`Created ${versionData.translations.length} translations for prompt version: ${newDbPromptVersion.id}`);
            }
            
            // 6. Manejar Tags
            if (tagNames && tagNames.length > 0) {
                const tagObjectsToConnect: { id: string }[] = [];
                for (const tagName of tagNames) {
                    let tag = await tx.tag.findUnique({ 
                        where: { projectId_name: { projectId, name: tagName } } 
                    });
                    if (!tag) {
                        tag = await tx.tag.create({ 
                            data: { projectId, name: tagName, description: `Tag: ${tagName}` } 
                        });
                        this.logger.debug(`Created Tag: ${tag.name}`);
                    }
                    tagObjectsToConnect.push({ id: tag.id });
                }
                if (tagObjectsToConnect.length > 0) {
                    await tx.prompt.update({
                        where: { id: prompt.id },
                        data: { tags: { connect: tagObjectsToConnect } },
                    });
                    this.logger.debug(`Connected ${tagObjectsToConnect.length} tags to prompt: ${prompt.name}`);
                }
            }

            // 7. Devolver el prompt principal creado con algunas relaciones para la respuesta
            const resultPrompt = await tx.prompt.findUniqueOrThrow({
                where: { prompt_id_project_unique: { id: promptSlug, projectId } },
                include: {
                    versions: {
                        orderBy: { createdAt: 'desc' },
                        take: 1, // Solo la versión que acabamos de crear
                        include: {
                            translations: true,
                        }
                    },
                    tags: true,
                }
            });
            this.logger.log(`Successfully loaded structure for prompt: ${resultPrompt.name}`);
            return resultPrompt;
        });
    }
}
