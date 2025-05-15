import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptVersion, Prompt, MarketplacePublishStatus } from '@prisma/client';
import { CreatePromptVersionDto } from 'src/prompt/dto/create-prompt-version.dto';
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
  ) { }

  // Helper to verify prompt access
  private async verifyPromptAccess(projectId: string, promptId: string): Promise<Prompt> {
    // Attempt to use findUnique again after DB reset
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });
    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${promptId}" not found.`);
    }
    if (prompt.projectId !== projectId) {
      throw new ForbiddenException(`Access denied to Prompt "${promptId}" for project "${projectId}".`);
    }
    return prompt;
  }

  async create(projectId: string, promptId: string, createDto: CreatePromptVersionDto): Promise<PromptVersion> {
    await this.verifyPromptAccess(projectId, promptId); // Ensure prompt exists in project

    // versionTag no viene de createDto. Se asignará 'v1.0.0' por defecto para la creación inicial.
    // const { ...versionData } = createDto; // No es necesario desestructurar así ahora

    const newVersionTag = 'v1.0.0'; // Asignación directa

    try {
      return await this.prisma.promptVersion.create({
        data: {
          ...createDto, // Usar todos los campos de createDto
          versionTag: newVersionTag,
          prompt: { connect: { id: promptId } }, // Connect using the prompt CUID
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Esto ahora atrapa versionTag duplicado para el MISMO promptId (CUID)
        throw new ConflictException(`Version tag "${newVersionTag}" already exists for prompt "${promptId}".`);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // Debería ser atrapado por verifyPromptAccess, pero se mantiene como respaldo
        throw new NotFoundException(`Prompt with ID "${promptId}" not found.`);
      }
      throw error;
    }
  }

  async findAllForPrompt(projectId: string, promptId: string): Promise<PromptVersion[]> {
    await this.verifyPromptAccess(projectId, promptId); // Verify access first

    return this.prisma.promptVersion.findMany({
      where: { promptId: promptId }, // Filter by prompt CUID
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByTag(projectId: string, promptId: string, versionTag: string, query?: ResolveAssetsQueryDto): Promise<PromptVersion> {
    await this.verifyPromptAccess(projectId, promptId);

    const version = await this.prisma.promptVersion.findUnique({
      where: {
        promptId_versionTag: { promptId: promptId, versionTag: versionTag },
      },
      include: {
        prompt: true,
        translations: true,
      },
    });

    if (!version) {
      throw new NotFoundException(`PromptVersion with tag "${versionTag}" not found for prompt "${promptId}".`);
    }

    if (query && query.resolveAssets === 'true') {
      let inputVariables: Record<string, any> = {};
      if (query.variables) {
        try {
          inputVariables = JSON.parse(query.variables);
        } catch (e) {
          this.logger.warn(`Failed to parse variables JSON string: ${query.variables}. Proceeding without variables.`);
        }
      }

      // The languageCode for asset translation should be query.regionCode if provided, 
      // otherwise, if we are fetching a specific prompt translation later, that languageCode would be used.
      // For a base prompt version, query.regionCode is the primary source for asset language.
      // If not resolving for a specific translation, query.regionCode is used for assets.
      const assetLanguageCode = query?.regionCode; // string | undefined

      const { processedText, resolvedAssetsMetadata } = await this.servePromptService.resolveAssets(
        version.promptText,    // text
        promptId,              // promptIdInput (slug of the Prompt)
        projectId,             // projectIdInput (CUID of the project the Prompt belongs to)
        assetLanguageCode,     // languageCode for asset translation (optional)
        inputVariables         // inputVariables (Record<string, any>)
      );
      version.promptText = processedText;
      // Optionally, attach resolvedAssetsMetadata to the version object if the return type is adjusted
      // (version as any).resolvedAssetsMetadata = resolvedAssetsMetadata; 
    }

    return version;
  }

  async update(projectId: string, promptId: string, versionTag: string, updateDto: UpdatePromptVersionDto): Promise<PromptVersion> {
    // Verify access and find the specific version by tag first
    // Pass undefined for query to avoid asset resolution during this specific find operation
    const existingVersion = await this.findOneByTag(projectId, promptId, versionTag, undefined);

    // Use updateDto directly

    try {
      return await this.prisma.promptVersion.update({
        where: {
          id: existingVersion.id // Use the CUID of the version found
        },
        data: updateDto, // Update allowed fields like promptText, changeMessage, status
      });
    } catch (error) {
      // P2025 should be caught by findOneByTag
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptVersion not found for update.`);
      }
      // Handle other potential errors if necessary
      throw error;
    }
  }

  async remove(projectId: string, promptId: string, versionTag: string): Promise<PromptVersion> {
    // Verify access and find the specific version by tag first
    const existingVersion = await this.findOneByTag(projectId, promptId, versionTag);

    // TODO: Add logic? Prevent deleting the last version? Prevent deleting active versions?

    try {
      return await this.prisma.promptVersion.delete({
        where: {
          id: existingVersion.id // Use the CUID of the version found
        },
      });
    } catch (error) {
      // P2025 should be caught by findOneByTag
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptVersion not found.`);
      }
      // P2003 could happen if translations, links, logs, etc., block deletion
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(`Cannot delete PromptVersion "${versionTag}" because it is still referenced by other entities (e.g., translations, links, logs).`);
      }
      throw error;
    }
  }

  // Remove or comment out old methods not fitting the new structure
  // findAll(): Promise<PromptVersion[]> { ... }
  // findOne(id: string): Promise<PromptVersion> { ... }
  // findByPromptId(promptId: string): Promise<PromptVersion[]> { ... }

  // --- Marketplace Methods ---

  async requestPublish(projectId: string, promptSlug: string, versionTag: string, requesterId: string): Promise<PromptVersion> {
    this.logger.log(`[User: ${requesterId}] Requesting to publish PromptVersion: project ${projectId}, slug ${promptSlug}, tag ${versionTag}`);

    const promptVersion = await this.findOneByTag(projectId, promptSlug, versionTag);

    const promptWithProject = await this.prisma.prompt.findUnique({
      where: { id: promptSlug, projectId: projectId }, // projectId es el del path, promptSlug es el id del prompt
      include: { project: { select: { tenantId: true } } },
    });

    if (!promptWithProject || !promptWithProject.project) {
      this.logger.warn(`Project not found for prompt "${promptSlug}" (Project ID: ${projectId}) during publish request by User: ${requesterId}.`);
      throw new NotFoundException(`Project not found for prompt "${promptSlug}" to determine tenant configuration.`);
    }
    const tenantId = promptWithProject.project.tenantId;
    this.logger.debug(`Tenant ID ${tenantId} identified for publish request of PromptVersion ${promptVersion.id} by User: ${requesterId}`);

    const requiresApproval = await this.tenantService.getMarketplaceRequiresApproval(tenantId);
    this.logger.log(`Marketplace requires approval for tenant ${tenantId}: ${requiresApproval}. PromptVersion ID: ${promptVersion.id}, User: ${requesterId}`);

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
      this.logger.log(`[User: ${requesterId}] PromptVersion ID ${updatedPromptVersion.id} status set to PENDING_APPROVAL.`);
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
      this.logger.log(`[User: ${requesterId}] PromptVersion ID ${updatedPromptVersion.id} status set to PUBLISHED directly.`);
    }
    return updatedPromptVersion;
  }

  async unpublish(projectId: string, promptSlug: string, versionTag: string, userId?: string): Promise<PromptVersion> {
    // userId es opcional aquí, pero útil para logging si se pasa desde el controlador
    const loggerCtx = `[User: ${userId || 'unknown'}]`;
    this.logger.log(`${loggerCtx} Requesting to unpublish PromptVersion: project ${projectId}, slug ${promptSlug}, tag ${versionTag}`);

    const promptVersion = await this.findOneByTag(projectId, promptSlug, versionTag);

    if (promptVersion.marketplaceStatus === MarketplacePublishStatus.NOT_PUBLISHED) {
      this.logger.warn(`${loggerCtx} PromptVersion ID ${promptVersion.id} is already NOT_PUBLISHED. No action taken.`);
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
    this.logger.log(`${loggerCtx} PromptVersion ID ${updatedPromptVersion.id} status set to NOT_PUBLISHED.`);
    return updatedPromptVersion;
  }

  // TODO: Métodos para approve, reject, cancel (Fase 2)
}
