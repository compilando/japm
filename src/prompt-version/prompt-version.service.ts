import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptVersion, Prompt } from '@prisma/client';
import { CreatePromptVersionDto } from 'src/prompt/dto/create-prompt-version.dto';
import { TenantService } from '../tenant/tenant.service';
import { MarketplacePublishStatus } from '@prisma/client';

@Injectable()
export class PromptVersionService {
  constructor(
    private prisma: PrismaService,
    private tenantService: TenantService,
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

  async findOneByTag(projectId: string, promptId: string, versionTag: string): Promise<PromptVersion> {
    await this.verifyPromptAccess(projectId, promptId);

    const version = await this.prisma.promptVersion.findUnique({
      where: {
        promptId_versionTag: { promptId: promptId, versionTag: versionTag }, // Use composite key
      },
      include: {
        prompt: true,
        translations: true,
        // assets: { include: { assetVersion: { include: { asset: true } } } } // ELIMINADO: ya no existe la relación assets
      },
    });

    if (!version) {
      throw new NotFoundException(`PromptVersion with tag "${versionTag}" not found for prompt "${promptId}".`);
    }
    // No need for extra projectId check here as verifyPromptAccess and the query ensure it
    return version;
  }

  async update(projectId: string, promptId: string, versionTag: string, updateDto: UpdatePromptVersionDto): Promise<PromptVersion> {
    // Verify access and find the specific version by tag first
    const existingVersion = await this.findOneByTag(projectId, promptId, versionTag);

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
    const promptVersion = await this.findOneByTag(projectId, promptSlug, versionTag);
    // findOneByTag ya incluye el prompt, y el prompt incluye el projectId.
    // Para obtener tenantId, necesitamos cargar el proyecto asociado al prompt.
    const promptWithProject = await this.prisma.prompt.findUnique({
      where: { id: promptSlug, projectId: projectId }, // projectId es el del path, promptSlug es el id del prompt
      include: { project: { select: { tenantId: true } } },
    });

    if (!promptWithProject || !promptWithProject.project) {
      throw new NotFoundException(`Project not found for prompt "${promptSlug}" to determine tenant configuration.`);
    }
    const tenantId = promptWithProject.project.tenantId;

    const requiresApproval = await this.tenantService.getMarketplaceRequiresApproval(tenantId);

    if (requiresApproval) {
      return this.prisma.promptVersion.update({
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
    } else {
      return this.prisma.promptVersion.update({
        where: { id: promptVersion.id },
        data: {
          marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
          marketplacePublishedAt: new Date(),
          marketplaceRequestedAt: new Date(), // Se solicita y publica al mismo tiempo
          marketplaceRequesterId: requesterId,
          // Limpiar campos de aprobación/rechazo
          marketplaceApprovedAt: null,
          marketplaceApproverId: null,
          marketplaceRejectionReason: null,
        },
      });
    }
  }

  async unpublish(projectId: string, promptSlug: string, versionTag: string, /* userId: string */): Promise<PromptVersion> {
    // TODO: Añadir lógica de permisos: ¿Quién puede retirar una versión?
    // Por ahora, cualquiera que pueda acceder a la versión a través de findOneByTag podría hacerlo.
    const promptVersion = await this.findOneByTag(projectId, promptSlug, versionTag);

    if (promptVersion.marketplaceStatus === MarketplacePublishStatus.NOT_PUBLISHED) {
      // Ya no está publicada, no hacer nada o devolver error/mensaje
      return promptVersion; // o lanzar new ConflictException('Version is not published.');
    }

    return this.prisma.promptVersion.update({
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
        marketplaceRejectionReason: null,
      },
    });
  }

  // TODO: Métodos para approve, reject, cancel (Fase 2)
}
