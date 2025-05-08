import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptVersion, Prompt } from '@prisma/client';
import { CreatePromptVersionDto } from 'src/prompt/dto/create-prompt-version.dto';

@Injectable()
export class PromptVersionService {
  constructor(private prisma: PrismaService) { }

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
        assets: { include: { assetVersion: { include: { asset: true } } } }
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
}
