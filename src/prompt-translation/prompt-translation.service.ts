import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreatePromptTranslationDto } from './dto/create-prompt-translation.dto';
import { UpdatePromptTranslationDto } from './dto/update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptTranslation, PromptVersion } from '@prisma/client';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';

@Injectable()
export class PromptTranslationService {
  constructor(private prisma: PrismaService) { }

  // Helper to verify access to the parent prompt version
  private async verifyVersionAccess(projectId: string, promptId: string, versionTag: string): Promise<PromptVersion> {
    const version = await this.prisma.promptVersion.findUnique({
      where: {
        promptId_versionTag: { promptId: promptId, versionTag: versionTag }
      },
      include: { prompt: true },
    });

    if (!version) {
      throw new NotFoundException(`PromptVersion with tag "${versionTag}" not found for prompt "${promptId}".`);
    }
    if (version.prompt.projectId !== projectId) {
      throw new ForbiddenException(`Access denied to PromptVersion "${versionTag}" for project "${projectId}".`);
    }
    return version; // Return the found version
  }

  async create(projectId: string, promptId: string, versionTag: string, createDto: CreatePromptTranslationDto): Promise<PromptTranslation> {
    const version = await this.verifyVersionAccess(projectId, promptId, versionTag);
    const { languageCode, promptText } = createDto;

    try {
      return await this.prisma.promptTranslation.create({
        data: {
          promptText,
          languageCode,
          version: { connect: { id: version.id } } // Connect using the verified version's CUID
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Translation for language "${languageCode}" already exists for version "${versionTag}" of prompt "${promptId}".`);
      }
      // P2025 should be caught by verifyVersionAccess
      throw error;
    }
  }

  async findAllForVersion(projectId: string, promptId: string, versionTag: string): Promise<PromptTranslation[]> {
    const version = await this.verifyVersionAccess(projectId, promptId, versionTag);
    return this.prisma.promptTranslation.findMany({
      where: { versionId: version.id },
    });
  }

  async findOneByLanguage(projectId: string, promptId: string, versionTag: string, languageCode: string): Promise<PromptTranslation> {
    const version = await this.verifyVersionAccess(projectId, promptId, versionTag);
    const translation = await this.prisma.promptTranslation.findUnique({
      where: {
        versionId_languageCode: { versionId: version.id, languageCode: languageCode }
      },
    });

    if (!translation) {
      throw new NotFoundException(`Translation for language "${languageCode}" not found for version "${versionTag}" of prompt "${promptId}".`);
    }
    return translation;
  }

  async update(projectId: string, promptId: string, versionTag: string, languageCode: string, updateDto: UpdatePromptTranslationDto): Promise<PromptTranslation> {
    // Verify access and find the specific translation first
    const existingTranslation = await this.findOneByLanguage(projectId, promptId, versionTag, languageCode);

    // updateDto should only contain promptText
    try {
      return await this.prisma.promptTranslation.update({
        where: {
          id: existingTranslation.id // Use CUID of the translation
        },
        data: updateDto,
      });
    } catch (error) {
      // P2025 should be caught by findOneByLanguage
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Translation not found for update.`);
      }
      throw error;
    }
  }

  async remove(projectId: string, promptId: string, versionTag: string, languageCode: string): Promise<PromptTranslation> {
    // Verify access and find the specific translation first
    const existingTranslation = await this.findOneByLanguage(projectId, promptId, versionTag, languageCode);

    try {
      return await this.prisma.promptTranslation.delete({
        where: {
          id: existingTranslation.id // Use CUID of the translation
        },
      });
    } catch (error) {
      // P2025 should be caught by findOneByLanguage
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Translation not found.`);
      }
      throw error;
    }
  }

  async upsertTranslation(versionId: string, dto: CreateOrUpdatePromptTranslationDto): Promise<PromptTranslation> {
    const { languageCode, promptText } = dto;

    // 1. Verificar que la versión del prompt exista
    const versionExists = await this.prisma.promptVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!versionExists) {
      throw new NotFoundException(`PromptVersion with ID "${versionId}" not found.`);
    }

    // 2. Crear o actualizar la traducción
    try {
      return await this.prisma.promptTranslation.upsert({
        where: {
          versionId_languageCode: { versionId, languageCode },
        },
        update: { promptText },
        create: { versionId, languageCode, promptText },
      });
    } catch (error) {
      console.error(`Failed to upsert prompt translation for version ${versionId} and language ${languageCode}:`, error);
      throw new Error('Could not save prompt translation.');
    }
  }

  async findByVersion(versionId: string): Promise<PromptTranslation[]> {
    return this.prisma.promptTranslation.findMany({
      where: { versionId },
    });
  }

  async removeTranslation(versionId: string, languageCode: string): Promise<PromptTranslation> {
    try {
      return await this.prisma.promptTranslation.delete({
        where: {
          versionId_languageCode: { versionId, languageCode },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Prompt Translation for language "${languageCode}" in version "${versionId}" not found.`);
      }
      throw error;
    }
  }
}
