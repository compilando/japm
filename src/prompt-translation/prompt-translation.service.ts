import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreatePromptTranslationDto } from './dto/create-prompt-translation.dto';
import { UpdatePromptTranslationDto } from './dto/update-prompt-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptTranslation } from '@prisma/client';

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
          throw new NotFoundException(`ConversationPromptVersion with ID "${versionId}" not found.`);
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
}
