import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreatePromptTranslationDto } from './dto/create-prompt-translation.dto';
import { UpdatePromptTranslationDto } from './dto/update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptTranslation } from '@prisma/client';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';

@Injectable()
export class PromptTranslationService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreatePromptTranslationDto): Promise<PromptTranslation> {
    const { versionId, languageCode, promptText } = createDto;
    try {
      return await this.prisma.promptTranslation.create({
        data: {
          promptText,
          languageCode,
          version: { // Conectar a la versión del prompt
            connect: { id: versionId }
          }
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Puede ser por ID (cuid) o por la clave única compuesta [versionId, languageCode]
          throw new ConflictException(`Translation for language "${languageCode}" already exists for version "${versionId}".`);
        }
        if (error.code === 'P2025') { // Versión del prompt no encontrada
          throw new NotFoundException(`PromptVersion with ID "${versionId}" not found.`);
        }
      }
      throw error;
    }
  }

  findAll(): Promise<PromptTranslation[]> {
    return this.prisma.promptTranslation.findMany({ include: { version: true } });
  }

  // Método útil para buscar traducciones de una versión específica
  findByVersionId(versionId: string): Promise<PromptTranslation[]> {
    return this.prisma.promptTranslation.findMany({
      where: { versionId },
      include: { version: false } // No es necesario incluir la versión aquí
    });
  }

  async findOne(id: string): Promise<PromptTranslation> {
    const translation = await this.prisma.promptTranslation.findUnique({
      where: { id },
      include: { version: { include: { prompt: true } } } // Incluir versión y prompt lógico
    });
    if (!translation) {
      throw new NotFoundException(`PromptTranslation with ID "${id}" not found`);
    }
    return translation;
  }

  // Podríamos necesitar un método findOneByVersionAndLanguage(versionId, languageCode)
  async findOneByVersionAndLanguage(versionId: string, languageCode: string): Promise<PromptTranslation | null> {
    return this.prisma.promptTranslation.findUnique({
      where: { versionId_languageCode: { versionId, languageCode } },
      include: { version: false }
    });
  }

  async update(id: string, updateDto: UpdatePromptTranslationDto): Promise<PromptTranslation> {
    // Solo se actualiza promptText según el DTO
    try {
      return await this.prisma.promptTranslation.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptTranslation with ID "${id}" not found for update.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<PromptTranslation> {
    try {
      return await this.prisma.promptTranslation.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptTranslation with ID "${id}" not found`);
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
