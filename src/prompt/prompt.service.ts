import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  Prompt,
  PromptVersion,
  PromptTranslation,
  Tag,
  Environment,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ProjectService } from '../project/project.service';
import { SystemPromptService } from '../system-prompt/system-prompt.service';
import { ChatOpenAI } from '@langchain/openai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { RawExecutionService } from '../raw-execution/raw-execution.service';
import { ExecuteRawDto } from '../raw-execution/dto/execute-raw.dto';
import { LoadPromptStructureDto } from './dto/load-prompt-structure.dto';
import { AuditLoggerService } from '../common/services/audit-logger.service';
import { LogContext } from '../common/services/structured-logger.service';
import {
  PromptBackupService,
  PromptBackupOptions,
} from '../common/services/prompt-backup.service';
import { TenantService } from '../tenant/tenant.service';
import { TagService } from '../tag/tag.service';
import { EnvironmentService } from '../environment/environment.service';
import { ActivityLogService, ActivityAction, ActivityEntityType } from '../services/activityLogService';

// Asumiendo que tenemos acceso a la función slugify (igual que en ProjectService)
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Type for findOne response
type PromptWithRelations = Prisma.PromptGetPayload<{
  include: {
    tags: true;
    versions: {
      include: {
        translations: true;
        activeInEnvironments: { select: { id: true; name: true } };
      };
      orderBy: { createdAt: 'desc' };
    };
  };
}>;

// Type for create response
type PromptWithInitialVersionAndTags = Prisma.PromptGetPayload<{
  include: {
    tags: true;
    versions: {
      include: {
        translations: true;
        activeInEnvironments: { select: { id: true; name: true } };
      };
    };
  };
}>;

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  constructor(
    private prisma: PrismaService,
    private tenantService: TenantService,
    private tagService: TagService,
    private environmentService: EnvironmentService,
    private projectService: ProjectService,
    private systemPromptService: SystemPromptService,
    private rawExecutionService: RawExecutionService,
    private auditLogger: AuditLoggerService,
    private promptBackupService: PromptBackupService,
    private activityLogService: ActivityLogService,
  ) { }

  // Helper to substitute variables (copied from RawExecutionService for now)
  private substituteVariables(
    text: string,
    variables?: Record<string, any>,
  ): string {
    if (!variables) return text;
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      // Use {{key}} format
      const value = variables[key.trim()];
      return value !== undefined ? String(value) : match; // Ensure value is string
    });
  }

  async create(
    createDto: CreatePromptDto,
    projectId: string,
    tenantId: string,
    ownerUserId: string,
  ): Promise<PromptWithInitialVersionAndTags> {
    const {
      name,
      description,
      promptText,
      languageCode,
      initialTranslations,
      tags,
      type,
      ...restData
    } = createDto;

    const slugifiedName = slugify(name);

    // Verificar que el proyecto existe
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }

    // Verificar que el tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${tenantId}" not found.`);
    }

    let tagsToConnect: Prisma.TagWhereUniqueInput[] | undefined = undefined;
    if (tags && tags.length > 0) {
      const existingTags = await this.prisma.tag.findMany({
        where: { name: { in: tags }, projectId: projectId },
        select: { id: true, name: true },
      });
      if (existingTags.length !== tags.length) {
        const foundTagNames = new Set(existingTags.map((t) => t.name));
        const missingTags = tags.filter((t) => !foundTagNames.has(t));
        throw new NotFoundException(
          `Tags not found in project '${projectId}': ${missingTags.join(', ')}`,
        );
      }
      tagsToConnect = existingTags.map((tag) => ({ id: tag.id }));
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.prompt.create({
          data: {
            id: slugifiedName,
            name: name,
            description: description,
            type: type,
            projectId: projectId,
            tenantId: tenantId,
            ownerUserId: ownerUserId,
            tags: tagsToConnect ? { connect: tagsToConnect } : undefined,
            ...restData,
          } as any,
        });

        await tx.promptVersion.create({
          data: {
            promptId: slugifiedName,
            promptText: promptText,
            versionTag: '1.0.0',
            languageCode: languageCode,
            changeMessage: 'Initial version created automatically.',
            translations:
              initialTranslations && initialTranslations.length > 0
                ? {
                  createMany: {
                    data: initialTranslations.map((t) => ({ ...t })),
                  },
                }
                : undefined,
          },
        });
      });

      const createdPrompt = await this.prisma.prompt.findUniqueOrThrow({
        where: {
          prompt_id_project_unique: {
            id: slugifiedName,
            projectId: projectId,
          },
        },
        include: {
          tags: true,
          versions: {
            where: { versionTag: '1.0.0' },
            include: {
              translations: true,
              activeInEnvironments: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Registrar la actividad
      await this.activityLogService.logActivity({
        action: ActivityAction.CREATE,
        entityType: ActivityEntityType.PROMPT,
        entityId: createdPrompt.id,
        userId: ownerUserId,
        projectId: projectId,
        details: {
          name: createdPrompt.name,
          type: createdPrompt.type,
          versionTag: '1.0.0',
        },
      });

      return createdPrompt;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A prompt with this name already exists in project '${projectId}'.`,
          );
        }
      }
      throw error;
    }
  }

  findAll(projectId: string, tenantId: string): Promise<Prompt[]> {
    return this.prisma.prompt.findMany({
      where: {
        projectId,
        tenantId
      },
      include: {
        tags: { select: { name: true } },
        versions: {
          select: { id: true, versionTag: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(
    promptIdSlug: string,
    projectId: string,
    tenantId: string,
  ): Promise<PromptWithRelations> {
    const prompt = await this.prisma.prompt.findUnique({
      where: {
        prompt_id_project_unique: {
          id: promptIdSlug,
          projectId: projectId,
        },
        tenantId: tenantId,
      },
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            translations: true,
            activeInEnvironments: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!prompt) {
      throw new NotFoundException(
        `Prompt with ID (slug) "${promptIdSlug}" not found in project "${projectId}".`,
      );
    }
    return prompt as PromptWithRelations;
  }

  async update(
    promptIdSlug: string,
    updateDto: UpdatePromptDto,
    projectId: string,
    tenantId: string,
    ownerUserId: string,
  ): Promise<PromptWithRelations> {
    const {
      name,
      description,
      tagIds,
      type,
      ...restData
    } = updateDto;

    // Verificar que el prompt existe
    const prompt = await this.prisma.prompt.findUnique({
      where: {
        prompt_id_project_unique: {
          id: promptIdSlug,
          projectId: projectId,
        },
        tenantId: tenantId,
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt with ID "${promptIdSlug}" not found in project "${projectId}".`,
      );
    }

    let tagsToConnect: Prisma.TagWhereUniqueInput[] | undefined = undefined;
    if (tagIds && tagIds.length > 0) {
      const existingTags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds }, projectId: projectId },
        select: { id: true, name: true },
      });
      if (existingTags.length !== tagIds.length) {
        const foundTagIds = new Set(existingTags.map((t) => t.id));
        const missingTags = tagIds.filter((id) => !foundTagIds.has(id));
        throw new NotFoundException(
          `Tags not found in project '${projectId}': ${missingTags.join(', ')}`,
        );
      }
      tagsToConnect = existingTags.map((tag) => ({ id: tag.id }));
    }

    try {
      const updatedPrompt = await this.prisma.prompt.update({
        where: {
          prompt_id_project_unique: {
            id: promptIdSlug,
            projectId: projectId,
          },
          tenantId: tenantId,
        },
        data: {
          name: name,
          description: description,
          type: type,
          ownerUserId: ownerUserId,
          tags: tagsToConnect ? { set: tagsToConnect } : undefined,
          ...restData,
        } as any,
        include: {
          tags: true,
          versions: {
            include: {
              translations: true,
              activeInEnvironments: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Registrar la actividad
      await this.activityLogService.logActivity({
        action: ActivityAction.UPDATE,
        entityType: ActivityEntityType.PROMPT,
        entityId: updatedPrompt.id,
        userId: ownerUserId,
        projectId: projectId,
        details: {
          name: updatedPrompt.name,
          type: updatedPrompt.type,
        },
      });

      return updatedPrompt;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A prompt with this name already exists in project '${projectId}'.`,
          );
        }
      }
      throw error;
    }
  }

  async remove(
    id: string,
    projectId: string,
    ownerUserId: string,
    tenantId: string,
    backupOptions?: Partial<PromptBackupOptions>,
  ): Promise<void> {
    const prompt = await this.prisma.prompt.findUnique({
      where: {
        prompt_id_project_unique: {
          id: id,
          projectId: projectId,
        },
        tenantId: tenantId,
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt with ID "${id}" not found in project "${projectId}".`,
      );
    }

    try {
      // Crear backup si se solicita
      if (backupOptions) {
        const fullBackupOptions: PromptBackupOptions = {
          deletedBy: ownerUserId,
          deletionReason: backupOptions.deletionReason || 'Manual deletion',
          includeExecutionLogs: backupOptions.includeExecutionLogs ?? true,
          executionLogsLimit: backupOptions.executionLogsLimit ?? 100,
        };
        await this.promptBackupService.createPromptBackup(
          id,
          projectId,
          fullBackupOptions,
        );
      }

      await this.prisma.prompt.delete({
        where: {
          prompt_id_project_unique: {
            id: id,
            projectId: projectId,
          },
          tenantId: tenantId,
        },
      });

      // Registrar la actividad
      await this.activityLogService.logActivity({
        action: ActivityAction.DELETE,
        entityType: ActivityEntityType.PROMPT,
        entityId: id,
        userId: ownerUserId,
        projectId: projectId,
        details: {
          name: prompt.name,
          type: prompt.type,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(
            `Cannot delete prompt "${id}" because it is referenced by other records.`,
          );
        }
      }
      throw error;
    }
  }

  // --- Version and Translation Methods --- //
  // Estos métodos usan el ID CUID de PromptVersion, pero necesitan el promptId (slug) para verificar pertenencia

  async createVersion(
    promptIdSlug: string,
    createVersionDto: CreatePromptVersionDto,
    projectId: string,
  ): Promise<PromptVersion> {
    // 1. Validar prompt padre usando slug
    const prompt = await this.prisma.prompt.findUnique({
      where: {
        prompt_id_project_unique: {
          id: promptIdSlug,
          projectId: projectId,
        },
      },
    }) as any;

    if (!prompt) {
      throw new NotFoundException(
        `Prompt with ID (slug) "${promptIdSlug}" not found in project "${projectId}".`,
      );
    }

    // 2. Se elimina la búsqueda de la versión más reciente y el cálculo del siguiente tag.
    // El versionTag ahora viene del DTO.

    // 3. Validar formato de versionTag (opcional, pero recomendado)
    // Ejemplo: si quisieras forzar un formato como vX.Y.Z
    // const versionTagRegex = /^v\d+\.\d+\.\d+$/;
    // if (!versionTagRegex.test(createVersionDto.versionTag)) {
    //   throw new BadRequestException(
    //     `Version tag "${createVersionDto.versionTag}" does not follow the expected format vX.Y.Z.`,
    //   );
    // }

    // 4. Crear la nueva versión usando el versionTag del DTO
    const {
      promptText,
      changeMessage,
      versionTag,
      languageCode,
      initialTranslations,
    } = createVersionDto;
    try {
      const newVersion = await this.prisma.promptVersion.create({
        data: {
          promptId: prompt.id, // prompt.id es el slug
          versionTag: versionTag, // Usar el tag del DTO
          promptText: promptText,
          languageCode: languageCode, // Usar el languageCode del DTO
          changeMessage: changeMessage || `Version ${versionTag} created.`, // Mensaje por defecto si no se provee
          translations:
            initialTranslations && initialTranslations.length > 0
              ? {
                createMany: {
                  data: initialTranslations.map((t) => ({ ...t })),
                },
              }
              : undefined,
          // Considerar añadir 'status' y 'activeInEnvironments' si es necesario por defecto
        },
        include: {
          translations: true,
          activeInEnvironments: { select: { id: true, name: true } },
        },
      });

      // Registrar la actividad
      await this.activityLogService.logActivity({
        action: ActivityAction.CREATE,
        entityType: ActivityEntityType.PROMPT_VERSION,
        entityId: newVersion.id,
        userId: prompt.ownerUserId,
        projectId: projectId,
        details: {
          promptId: promptIdSlug,
          versionTag: newVersion.versionTag,
          languageCode: newVersion.languageCode,
        },
      });

      return newVersion;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // El error P2002 aquí se debe a la constraint unique (promptId, versionTag)
        throw new ConflictException(
          `Failed to create version. Tag '${versionTag}' already exists for prompt '${prompt.name}'.`,
        );
      }
      this.logger.error(
        `Error creating version '${versionTag}' for prompt '${prompt.name}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // MODIFICADO: Verificar pertenencia usando promptId (slug)
  async addOrUpdateTranslation(
    promptVersionIdCuid: string,
    translationDto: CreateOrUpdatePromptTranslationDto,
    projectId: string, // Necesitamos projectId aquí
  ): Promise<PromptTranslation> {
    // Obtener versión y verificar pertenencia del prompt padre al proyecto
    const version = await this.prisma.promptVersion.findUnique({
      where: { id: promptVersionIdCuid },
      include: { prompt: true },
    });

    if (!version) {
      throw new NotFoundException(
        `PromptVersion with ID "${promptVersionIdCuid}" not found.`,
      );
    }
    // Comprobar si el proyecto del prompt padre coincide con el projectId de la ruta
    if (version.prompt.projectId !== projectId) {
      throw new ForbiddenException(
        `Access denied. PromptVersion "${promptVersionIdCuid}" does not belong to project "${projectId}".`,
      );
    }

    const { languageCode, promptText } = translationDto;
    const translation = await this.prisma.promptTranslation.upsert({
      where: {
        versionId_languageCode: {
          versionId: promptVersionIdCuid,
          languageCode,
        },
      },
      update: { promptText },
      create: { versionId: promptVersionIdCuid, languageCode, promptText },
    });

    // Registrar la actividad
    await this.activityLogService.logActivity({
      action: ActivityAction.UPDATE,
      entityType: ActivityEntityType.PROMPT_TRANSLATION,
      entityId: translation.id,
      userId: (version.prompt as any).ownerUserId,
      projectId: projectId,
      details: {
        promptVersionId: promptVersionIdCuid,
        languageCode: translation.languageCode,
      },
    });

    return translation;
  }

  /**
   * Generates a suggested prompt structure using an LLM via RawExecutionService.
   * @param projectId The CUID of the project to get regions from.
   * @param userOriginalPrompt The user's initial prompt text.
   * @param projectRegions The project regions to be used for the system prompt.
   * @param targetAiModelApiIdentifier The CUID of the AIModel to use (defaults to a placeholder).
   * @returns A JSON object representing the suggested structure.
   */
  async generateStructure(
    projectId: string,
    userOriginalPrompt: string,
    projectRegions: { languageCode: string; name: string }[],
    targetAiModelApiIdentifier: string = 'gpt-4o',
  ): Promise<object> {
    this.logger.debug(
      `Starting generateStructure for projectId: ${projectId}, targetModel: ${targetAiModelApiIdentifier}`,
    );

    // 1. projectRegions are now passed directly
    const projectRegionsJson = JSON.stringify(projectRegions);
    this.logger.debug(
      `Project regions for system prompt: ${projectRegionsJson}`,
    );

    // 2. Buscar el AIModel por su apiIdentifier (o nombre) DENTRO DE 'default-project'
    const defaultProjectId = 'default-project'; // ID del proyecto donde residen los modelos globales
    const aiModel = await this.prisma.aIModel.findFirst({
      where: {
        projectId: defaultProjectId, // Siempre buscar en 'default-project'
        OR: [
          { apiIdentifier: targetAiModelApiIdentifier },
          { name: targetAiModelApiIdentifier },
        ],
      },
    });

    if (!aiModel) {
      this.logger.error(
        `AI Model with identifier "${targetAiModelApiIdentifier}" not found in project "${defaultProjectId}".`,
      );
      throw new NotFoundException(
        `AI Model with identifier "${targetAiModelApiIdentifier}" not found in the default project context.`,
      );
    }
    this.logger.log(
      `Found AI Model: ${aiModel.name} (ID: ${aiModel.id} from project ${defaultProjectId}) to be used.`,
    );

    // 3. Definir el userText para RawExecutionService
    const instructionForLLM = `Analyze the following user's request and propose a structured JSON output for a new prompt. The user's original request is: "${userOriginalPrompt}"`;

    const dto: ExecuteRawDto = {
      userText: instructionForLLM,
      systemPromptName: 'prompt-generator',
      aiModelId: aiModel.id,
      variables: {
        project_regions_json: projectRegionsJson,
        user_original_prompt: userOriginalPrompt,
      },
    };

    this.logger.log(
      `Calling RawExecutionService.executeRaw with DTO: ${JSON.stringify(dto)}`,
    );

    try {
      const rawResponse = await this.rawExecutionService.executeRaw(dto);
      this.logger.debug(
        `Raw response from RawExecutionService: ${JSON.stringify(rawResponse)}`,
      );

      // Intentar parsear la respuesta como JSON.
      try {
        // Limpiar el string de respuesta de posibles marcadores de bloque de código Markdown
        const cleanedResponseString = rawResponse.response
          .replace(/^\s*```json\s*/im, '') // Elimina ```json al inicio (case-insensitive, multiline)
          .replace(/\s*```\s*$/im, '') // Elimina ``` al final (case-insensitive, multiline)
          .trim(); // Elimina espacios en blanco al inicio/final

        if (!cleanedResponseString) {
          this.logger.error(
            'LLM response was empty after cleaning Markdown markers.',
          );
          throw new InternalServerErrorException(
            'AI response was empty or contained only Markdown markers.',
          );
        }

        this.logger.debug(
          `Cleaned response string for JSON parsing: ${cleanedResponseString}`,
        );
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
        this.logger.error(
          `Error from RawExecutionService: ${error.message}`,
          error.stack,
        );
        throw error;
      }
      this.logger.error(
        `Error calling RawExecutionService: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `An unexpected error occurred while generating the prompt structure: ${error.message}`,
      );
    }
  }

  async loadStructure(
    projectId: string,
    dto: LoadPromptStructureDto,
    tenantId: string,
  ): Promise<Prompt> {
    const {
      prompt: promptMeta,
      version: versionData,
      assets: assetEntries,
      tags: tagNames,
      languageCode,
    } = dto;

    // Crear slug para el prompt
    const promptSlug = slugify(promptMeta.name);

    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar que el prompt no existe
      const existingPrompt = await tx.prompt.findUnique({
        where: { prompt_id_project_unique: { id: promptSlug, projectId } },
      });

      if (existingPrompt) {
        throw new ConflictException(
          `Prompt with name (slug: "${promptSlug}") already exists in project "${projectId}".`,
        );
      }

      // 2. Crear Prompt
      const prompt = await tx.prompt.create({
        data: {
          id: promptSlug,
          name: promptMeta.name,
          description: promptMeta.description,
          projectId: projectId,
          tenantId: tenantId,
          ownerUserId: promptMeta.ownerUserId,
          type: promptMeta.type
        },
      });

      this.logger.debug(`Created prompt: ${prompt.name} (ID: ${prompt.id})`);

      // 3. Crear Assets, sus Versiones y Traducciones de Assets
      const createdAssetsData = new Map<
        string,
        { cuid: string; name: string; value: string }
      >();

      if (assetEntries && assetEntries.length > 0) {
        for (const assetEntry of assetEntries) {
          const existingAsset = await tx.promptAsset.findFirst({
            where: {
              key: assetEntry.key,
              promptId: prompt.id,
              prompt: {
                projectId: projectId,
              },
            },
          });
          if (existingAsset) {
            throw new ConflictException(
              `Asset with key "${assetEntry.key}" already exists for prompt "${prompt.id}" in project "${projectId}".`,
            );
          }

          const newDbAsset = await tx.promptAsset.create({
            data: {
              key: assetEntry.key,
              prompt: {
                connect: {
                  prompt_id_project_unique: {
                    id: prompt.id,
                    projectId: projectId,
                  },
                },
              },
            },
          });

          const newDbAssetVersion = await tx.promptAssetVersion.create({
            data: {
              assetId: newDbAsset.id,
              value: assetEntry.value,
              changeMessage:
                assetEntry.changeMessage ||
                'Initial version from loaded structure.',
              status: 'active',
              versionTag: '1.0.0',
            },
          });

          if (assetEntry.translations && assetEntry.translations.length > 0) {
            await tx.assetTranslation.createMany({
              data: assetEntry.translations.map((t) => ({
                versionId: newDbAssetVersion.id,
                languageCode: t.languageCode,
                value: t.promptText,
              })),
            });
          }
          createdAssetsData.set(newDbAsset.key, {
            cuid: newDbAsset.id,
            name: assetEntry.name,
            value: assetEntry.value,
          });
        }
      }

      // 4. Crear PromptVersion
      const newDbPromptVersion = await tx.promptVersion.create({
        data: {
          promptId: prompt.id,
          promptText: versionData.promptText,
          languageCode: languageCode,
          changeMessage:
            versionData.changeMessage ||
            'Initial version from loaded structure.',
          versionTag: '1.0.0',
          status: 'active',
        },
      });

      // 5. Crear PromptTranslations
      if (versionData.translations && versionData.translations.length > 0) {
        await tx.promptTranslation.createMany({
          data: versionData.translations.map((t) => ({
            versionId: newDbPromptVersion.id,
            languageCode: t.languageCode,
            promptText: t.promptText,
          })),
        });
      }

      // 6. Manejar Tags
      if (tagNames && tagNames.length > 0) {
        const tagObjectsToConnect: { id: string }[] = [];
        for (const tagName of tagNames) {
          let tag = await tx.tag.findUnique({
            where: { projectId_name: { projectId, name: tagName } },
          });
          if (!tag) {
            tag = await tx.tag.create({
              data: {
                projectId,
                name: tagName,
                description: `Tag: ${tagName}`,
              },
            });
          }
          tagObjectsToConnect.push({ id: tag.id });
        }
        if (tagObjectsToConnect.length > 0) {
          await tx.prompt.update({
            where: { id: prompt.id },
            data: { tags: { connect: tagObjectsToConnect } },
          });
        }
      }

      // 7. Devolver el prompt creado con sus relaciones
      return tx.prompt.findUniqueOrThrow({
        where: { prompt_id_project_unique: { id: promptSlug, projectId } },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              translations: true,
            },
          },
          tags: true,
        },
      });
    });
  }

  async getVersions(
    promptIdSlug: string,
    projectId: string,
    tenantId: string,
  ): Promise<PromptVersion[]> {
    const prompt = await this.prisma.prompt.findUnique({
      where: {
        prompt_id_project_unique: {
          id: promptIdSlug,
          projectId: projectId,
        },
        tenantId: tenantId,
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt with ID (slug) "${promptIdSlug}" not found in project "${projectId}".`,
      );
    }

    return this.prisma.promptVersion.findMany({
      where: { promptId: prompt.id },
      orderBy: { createdAt: 'desc' },
      include: {
        translations: true,
        activeInEnvironments: { select: { id: true, name: true } },
      },
    });
  }
}