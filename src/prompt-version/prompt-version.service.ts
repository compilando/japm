import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  PromptVersion,
  Prompt,
  MarketplacePublishStatus,
} from '@prisma/client';
import { CreatePromptVersionDto } from '../prompt/dto/create-prompt-version.dto';
import { TenantService } from '../tenant/tenant.service';
import { ServePromptService } from '../serve-prompt/serve-prompt.service';
import { ResolveAssetsQueryDto } from '../serve-prompt/dto/resolve-assets-query.dto';

@Injectable()
export class PromptVersionService {
  private readonly logger = new Logger(PromptVersionService.name);

  constructor(
    private prisma: PrismaService,
    private tenantService: TenantService,
    private servePromptService: ServePromptService,
  ) {}

  // Helper to verify prompt access
  private async verifyPromptAccess(
    projectId: string,
    promptId: string,
  ): Promise<Prompt> {
    // Attempt to use findUnique again after DB reset
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });
    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${promptId}" not found.`);
    }
    if (prompt.projectId !== projectId) {
      throw new ForbiddenException(
        `Access denied to Prompt "${promptId}" for project "${projectId}".`,
      );
    }
    return prompt;
  }

  async create(
    projectId: string,
    promptId: string,
    createDto: CreatePromptVersionDto,
  ): Promise<PromptVersion> {
    await this.verifyPromptAccess(projectId, promptId); // Ensure prompt exists in project

    // versionTag no viene de createDto. Se asignará '1.0.0' por defecto para la creación inicial.
    // const { ...versionData } = createDto; // No es necesario desestructurar así ahora

    const newVersionTag = '1.0.0'; // Asignación directa

    try {
      return await this.prisma.promptVersion.create({
        data: {
          ...createDto, // Usar todos los campos de createDto
          versionTag: newVersionTag,
          prompt: { connect: { id: promptId } }, // Connect using the prompt CUID
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Esto ahora atrapa versionTag duplicado para el MISMO promptId (CUID)
        throw new ConflictException(
          `Version tag "${newVersionTag}" already exists for prompt "${promptId}".`,
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // Debería ser atrapado por verifyPromptAccess, pero se mantiene como respaldo
        throw new NotFoundException(`Prompt with ID "${promptId}" not found.`);
      }
      throw error;
    }
  }

  async findAllForPrompt(
    projectId: string,
    promptId: string,
  ): Promise<PromptVersion[]> {
    await this.verifyPromptAccess(projectId, promptId); // Verify access first

    return this.prisma.promptVersion.findMany({
      where: { promptId: promptId }, // Filter by prompt CUID
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByTag(
    projectId: string,
    promptId: string,
    versionTag: string,
    query: ResolveAssetsQueryDto = {},
  ): Promise<PromptVersion> {
    const prompt = await this.prisma.prompt.findFirst({
      where: {
        projectId,
        id: promptId,
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt with ID "${promptId}" not found in project "${projectId}".`,
      );
    }

    let version: PromptVersion | null;
    if (versionTag === 'latest') {
      version = await this.prisma.promptVersion.findFirst({
        where: {
          promptId: prompt.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      version = await this.prisma.promptVersion.findUnique({
        where: {
          promptId_versionTag: {
            promptId: prompt.id,
            versionTag,
          },
        },
      });
    }

    if (!version) {
      throw new NotFoundException(
        `Version "${versionTag}" not found for prompt "${promptId}" in project "${projectId}".`,
      );
    }

    // Si se solicita el prompt procesado, usamos el ServePromptService
    if (query.processed) {
      console.log(
        `🚨🚨🚨 [SUPER OBVIOUS PROMPT-VERSION] query.processed=true detected! 🚨🚨🚨`,
      );
      this.logger.debug(
        `🚀 [PROCESSED PROMPT] Processing prompt "${promptId}" v${versionTag} in project "${projectId}" with regionCode="${query.regionCode || 'none'}" and variables="${query.variables || 'none'}"`,
      );

      this.logger.debug(
        `🔍 [PROCESSED PROMPT] About to call ServePromptService.executePromptVersion with parameters:`,
      );
      this.logger.debug(`  - projectId: "${projectId}"`);
      this.logger.debug(
        `  - promptName: "${prompt.id}" (slug - name: "${prompt.name}")`,
      );
      this.logger.debug(`  - versionTag: "${versionTag}"`);
      this.logger.debug(`  - languageCode: "${query.regionCode}"`);
      this.logger.debug(
        `  - variables: ${JSON.stringify(query.variables ? JSON.parse(query.variables) : {})}`,
      );
      this.logger.debug(`  - processedPrompts: new Set() (empty)`);
      this.logger.debug(`  - context: {currentDepth: 0, maxDepth: 5}`);

      console.log(
        `🚨🚨🚨 [SUPER OBVIOUS PROMPT-VERSION] About to call ServePromptService.executePromptVersion! 🚨🚨🚨`,
      );
      const { processedPrompt } =
        await this.servePromptService.executePromptVersion(
          {
            projectId,
            promptName: prompt.id,
            versionTag,
            languageCode: query.regionCode,
          },
          {
            variables: query.variables ? JSON.parse(query.variables) : {},
          },
          new Set(), // processedPrompts - empty set for new resolution chain
          {
            currentDepth: 0,
            maxDepth: 5, // context with depth control
          },
        );

      console.log(
        `🚨🚨🚨 [SUPER OBVIOUS PROMPT-VERSION] ServePromptService returned successfully! 🚨🚨🚨`,
      );
      this.logger.debug(
        `✅ [PROCESSED PROMPT] ServePromptService returned. Result length: ${processedPrompt.length}`,
      );
      this.logger.debug(
        `✅ [PROCESSED PROMPT] Result preview: "${processedPrompt.substring(0, 300)}${processedPrompt.length > 300 ? '...' : ''}"`,
      );

      // Check if prompt references were resolved by looking for remaining placeholders
      const remainingPlaceholders =
        processedPrompt.match(/\{\{prompt:[^}]+\}\}/g);
      if (remainingPlaceholders) {
        this.logger.warn(
          `⚠️ [PROCESSED PROMPT] Found ${remainingPlaceholders.length} unresolved prompt placeholder(s): ${remainingPlaceholders.join(', ')}`,
        );
      } else {
        this.logger.debug(
          `✅ [PROCESSED PROMPT] All prompt references appear to have been resolved successfully`,
        );
      }

      // Creamos una copia del objeto version y reemplazamos el promptText con el procesado
      return {
        ...version,
        promptText: processedPrompt,
      };
    }

    return version;
  }

  async update(
    projectId: string,
    promptId: string,
    versionTag: string,
    updateDto: UpdatePromptVersionDto,
  ): Promise<PromptVersion> {
    // Verify access and find the specific version by tag first
    // Pass undefined for query to avoid asset resolution during this specific find operation
    const existingVersion = await this.findOneByTag(
      projectId,
      promptId,
      versionTag,
      undefined,
    );

    // Use updateDto directly

    try {
      return await this.prisma.promptVersion.update({
        where: {
          id: existingVersion.id, // Use the CUID of the version found
        },
        data: updateDto, // Update allowed fields like promptText, changeMessage, status
      });
    } catch (error) {
      // P2025 should be caught by findOneByTag
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`PromptVersion not found for update.`);
      }
      // Handle other potential errors if necessary
      throw error;
    }
  }

  async remove(
    projectId: string,
    promptId: string,
    versionTag: string,
  ): Promise<PromptVersion> {
    this.logger.log(
      `Attempting to delete version "${versionTag}" from prompt "${promptId}" in project "${projectId}"`,
    );

    let existingVersion: PromptVersion;
    try {
      // Verify access and find the specific version by tag first
      existingVersion = await this.findOneByTag(
        projectId,
        promptId,
        versionTag,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Version already doesn't exist - this is idempotent behavior
        this.logger.log(
          `Version "${versionTag}" not found for prompt "${promptId}" in project "${projectId}" - already deleted or never existed`,
        );

        // Return a mock version object to maintain API compatibility
        // Since the original method returns PromptVersion, we create a minimal mock
        const mockVersion: PromptVersion = {
          id: `deleted-${versionTag}-${Date.now()}`,
          promptId,
          versionTag,
          promptText: '',
          languageCode: 'en',
          changeMessage: 'Already deleted or never existed',
          status: 'active' as any,
          aiModelId: null,
          marketplaceStatus: 'NOT_PUBLISHED' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          marketplaceRequestedAt: null,
          marketplaceRequesterId: null,
          marketplaceApprovedAt: null,
          marketplaceApproverId: null,
          marketplacePublishedAt: null,
          marketplaceRejectionReason: null,
        };

        return mockVersion; // Return successfully (idempotent)
      }

      this.logger.error(
        `Error finding version "${versionTag}" for deletion: ${error.message}`,
        error.stack,
      );
      throw error;
    }

    // TODO: Add logic? Prevent deleting the last version? Prevent deleting active versions?

    try {
      const deletedVersion = await this.prisma.promptVersion.delete({
        where: {
          id: existingVersion.id, // Use the CUID of the version found
        },
      });

      this.logger.log(
        `Successfully deleted version "${versionTag}" (ID: ${existingVersion.id}) from prompt "${promptId}"`,
      );
      return deletedVersion;
    } catch (error) {
      // Handle specific Prisma errors for idempotent behavior
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // Version was deleted by another process between findOneByTag and delete
        this.logger.log(
          `Version "${versionTag}" was already deleted by another process during deletion attempt`,
        );

        // Return the existing version data (successful idempotent operation)
        return existingVersion;
      }

      // P2003 could happen if translations, links, logs, etc., block deletion
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          `Cannot delete PromptVersion "${versionTag}" because it is still referenced by other entities (e.g., translations, links, logs).`,
        );
      }

      this.logger.error(
        `Failed to delete version "${versionTag}" from prompt "${promptId}": ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Remove or comment out old methods not fitting the new structure
  // findAll(): Promise<PromptVersion[]> { ... }
  // findOne(id: string): Promise<PromptVersion> { ... }
  // findByPromptId(promptId: string): Promise<PromptVersion[]> { ... }

  // --- Marketplace Methods ---

  async requestPublish(
    projectId: string,
    promptSlug: string,
    versionTag: string,
    requesterId: string,
  ): Promise<PromptVersion> {
    this.logger.log(
      `[User: ${requesterId}] Requesting to publish PromptVersion: project ${projectId}, slug ${promptSlug}, tag ${versionTag}`,
    );

    const promptVersion = await this.findOneByTag(
      projectId,
      promptSlug,
      versionTag,
    );

    const promptWithProject = await this.prisma.prompt.findUnique({
      where: { id: promptSlug, projectId: projectId }, // projectId es el del path, promptSlug es el id del prompt
      include: { project: { select: { tenantId: true } } },
    });

    if (!promptWithProject || !promptWithProject.project) {
      this.logger.warn(
        `Project not found for prompt "${promptSlug}" (Project ID: ${projectId}) during publish request by User: ${requesterId}.`,
      );
      throw new NotFoundException(
        `Project not found for prompt "${promptSlug}" to determine tenant configuration.`,
      );
    }
    const tenantId = promptWithProject.project.tenantId;
    this.logger.debug(
      `Tenant ID ${tenantId} identified for publish request of PromptVersion ${promptVersion.id} by User: ${requesterId}`,
    );

    const requiresApproval =
      await this.tenantService.getMarketplaceRequiresApproval(tenantId);
    this.logger.log(
      `Marketplace requires approval for tenant ${tenantId}: ${requiresApproval}. PromptVersion ID: ${promptVersion.id}, User: ${requesterId}`,
    );

    let updatedPromptVersion: PromptVersion;
    if (requiresApproval) {
      updatedPromptVersion = await this.prisma.promptVersion.update({
        where: { id: promptVersion.id },
        data: {
          marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
          marketplaceRequestedAt: new Date(),
          marketplaceRequesterId: requesterId,
          // Limpiar campos de aprobación/publicación por si se solicita de nuevo
          marketplaceApprovedAt: null,
          marketplaceApproverId: null,
          marketplacePublishedAt: null,
          marketplaceRejectionReason: null,
        },
      });
      this.logger.log(
        `[User: ${requesterId}] PromptVersion ID ${updatedPromptVersion.id} status set to PENDING_APPROVAL.`,
      );
    } else {
      updatedPromptVersion = await this.prisma.promptVersion.update({
        where: { id: promptVersion.id },
        data: {
          marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
          marketplacePublishedAt: new Date(),
          marketplaceRequestedAt: new Date(), // Se solicita y publica al mismo tiempo
          marketplaceRequesterId: requesterId,
          // Limpiar campos de aprobación/rechazo
          marketplaceApprovedAt: null, // Asumimos que no hay aprobador si se publica directo
          marketplaceApproverId: null,
          marketplaceRejectionReason: null,
        },
      });
      this.logger.log(
        `[User: ${requesterId}] PromptVersion ID ${updatedPromptVersion.id} status set to PUBLISHED directly.`,
      );
    }
    return updatedPromptVersion;
  }

  async unpublish(
    projectId: string,
    promptSlug: string,
    versionTag: string,
    userId?: string,
  ): Promise<PromptVersion> {
    // userId es opcional aquí, pero útil para logging si se pasa desde el controlador
    const loggerCtx = `[User: ${userId || 'unknown'}]`;
    this.logger.log(
      `${loggerCtx} Requesting to unpublish PromptVersion: project ${projectId}, slug ${promptSlug}, tag ${versionTag}`,
    );

    const promptVersion = await this.findOneByTag(
      projectId,
      promptSlug,
      versionTag,
    );

    if (
      promptVersion.marketplaceStatus === MarketplacePublishStatus.NOT_PUBLISHED
    ) {
      this.logger.warn(
        `${loggerCtx} PromptVersion ID ${promptVersion.id} is already NOT_PUBLISHED. No action taken.`,
      );
      return promptVersion;
    }

    const updatedPromptVersion = await this.prisma.promptVersion.update({
      where: { id: promptVersion.id },
      data: {
        marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
        marketplacePublishedAt: null,
        marketplaceApprovedAt: null,
        marketplaceApproverId: null,
        // Considerar si marketplaceRequestedAt y marketplaceRequesterId deben limpiarse también
        // o si se quiere mantener el historial de quién lo solicitó originalmente.
        // Por simplicidad inicial, los limpiamos:
        marketplaceRequestedAt: null,
        marketplaceRequesterId: null,
        marketplaceRejectionReason: null, // Limpiar razón de rechazo si la hubo antes
      },
    });
    this.logger.log(
      `${loggerCtx} PromptVersion ID ${updatedPromptVersion.id} status set to NOT_PUBLISHED.`,
    );
    return updatedPromptVersion;
  }

  /**
   * Devuelve la versión por tag o la más reciente si versionTag === 'latest'.
   */
  async getByTagOrLatest(
    projectId: string,
    promptId: string,
    versionTag: string,
  ): Promise<PromptVersion> {
    await this.verifyPromptAccess(projectId, promptId);
    if (versionTag === 'latest') {
      const version = await this.prisma.promptVersion.findFirst({
        where: { promptId },
        orderBy: { createdAt: 'desc' },
      });
      if (!version)
        throw new NotFoundException(
          `No versions found for prompt "${promptId}" in project "${projectId}".`,
        );
      return version;
    } else {
      const version = await this.prisma.promptVersion.findUnique({
        where: { promptId_versionTag: { promptId, versionTag } },
      });
      if (!version)
        throw new NotFoundException(
          `PromptVersion with tag "${versionTag}" not found for prompt "${promptId}".`,
        );
      return version;
    }
  }

  // TODO: Métodos para approve, reject, cancel (Fase 2)
}
