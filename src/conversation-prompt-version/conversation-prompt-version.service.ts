import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateConversationPromptVersionDto } from './dto/create-conversation-prompt-version.dto';
import { UpdateConversationPromptVersionDto } from './dto/update-conversation-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConversationPromptVersion } from '@prisma/client';

@Injectable()
export class ConversationPromptVersionService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateConversationPromptVersionDto): Promise<ConversationPromptVersion> {
    const { promptId, ...restData } = createDto;
    try {
      return await this.prisma.conversationPromptVersion.create({
        data: {
          ...restData, // promptText, versionTag, changeMessage
          prompt: { // Conectar al prompt lógico
            connect: { name: promptId } // Usar el 'name' del prompt como FK
          }
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Puede ser por ID (cuid) o por la clave única compuesta [promptId, versionTag]
          throw new ConflictException(`Version "${createDto.versionTag}" already exists for prompt "${promptId}".`);
        }
        if (error.code === 'P2025') { // Prompt lógico no encontrado
          throw new NotFoundException(`Prompt with ID "${promptId}" not found.`);
        }
      }
      throw error;
    }
  }

  findAll(): Promise<ConversationPromptVersion[]> {
    // Considerar paginación o filtrado si la lista crece mucho
    // Excluir relaciones complejas por defecto?
    return this.prisma.conversationPromptVersion.findMany({
      include: { prompt: true } // Incluir el prompt lógico asociado
    });
  }

  async findOne(id: string): Promise<ConversationPromptVersion> {
    const version = await this.prisma.conversationPromptVersion.findUnique({
      where: { id },
      include: {
        prompt: true,
        translations: true,
        assets: { include: { assetVersion: true } } // Incluir info del asset version ligado
      },
    });
    if (!version) {
      throw new NotFoundException(`ConversationPromptVersion with ID "${id}" not found`);
    }
    return version;
  }

  // Método útil para buscar versiones de un prompt específico
  findByPromptId(promptId: string): Promise<ConversationPromptVersion[]> {
    return this.prisma.conversationPromptVersion.findMany({
      where: { promptId },
      orderBy: { createdAt: 'desc' }, // Ordenar por fecha de creación descendente?
      include: { prompt: false } // No incluir prompt aquí ya que lo filtramos
    });
  }

  async update(id: string, updateDto: UpdateConversationPromptVersionDto): Promise<ConversationPromptVersion> {
    // Solo se actualizan promptText y changeMessage según el DTO
    try {
      return await this.prisma.conversationPromptVersion.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`ConversationPromptVersion with ID "${id}" not found for update.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<ConversationPromptVersion> {
    try {
      // Eliminar una versión puede requerir lógica adicional
      // (e.g., asegurar que no sea la versión activa de un prompt?)
      // Por ahora, solo eliminamos.
      return await this.prisma.conversationPromptVersion.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`ConversationPromptVersion with ID "${id}" not found`);
      }
      // P2003 podría ocurrir si hay traducciones o links de assets asociados
      throw error;
    }
  }
}
