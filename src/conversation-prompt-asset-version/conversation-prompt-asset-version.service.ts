import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateConversationPromptAssetVersionDto } from './dto/create-conversation-prompt-asset-version.dto';
import { UpdateConversationPromptAssetVersionDto } from './dto/update-conversation-prompt-asset-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConversationPromptAssetVersion } from '@prisma/client';

@Injectable()
export class ConversationPromptAssetVersionService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateConversationPromptAssetVersionDto): Promise<ConversationPromptAssetVersion> {
    const { assetId, ...restData } = createDto;
    try {
      return await this.prisma.conversationPromptAssetVersion.create({
        data: {
          ...restData, // value, versionTag, changeMessage
          asset: { // Conectar al asset lógico
            connect: { key: assetId } // Usar el 'key' del asset como FK
          }
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Puede ser por ID (cuid) o por la clave única compuesta [assetId, versionTag]
          throw new ConflictException(`Version "${createDto.versionTag}" already exists for asset "${assetId}".`);
        }
        if (error.code === 'P2025') { // Asset lógico no encontrado
          throw new NotFoundException(`Asset with Key "${assetId}" not found.`);
        }
      }
      throw error;
    }
  }

  findAll(): Promise<ConversationPromptAssetVersion[]> {
    return this.prisma.conversationPromptAssetVersion.findMany({
      include: { asset: true }
    });
  }

  async findOne(id: string): Promise<ConversationPromptAssetVersion> {
    const version = await this.prisma.conversationPromptAssetVersion.findUnique({
      where: { id },
      include: {
        asset: true,
        translations: true,
        links: { include: { promptVersion: true } } // Incluir info del prompt version ligado
      },
    });
    if (!version) {
      throw new NotFoundException(`ConversationPromptAssetVersion with ID "${id}" not found`);
    }
    return version;
  }

  // Método útil para buscar versiones de un asset específico
  findByAssetId(assetId: string): Promise<ConversationPromptAssetVersion[]> {
    return this.prisma.conversationPromptAssetVersion.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      include: { asset: false }
    });
  }

  async update(id: string, updateDto: UpdateConversationPromptAssetVersionDto): Promise<ConversationPromptAssetVersion> {
    // Solo se actualizan value y changeMessage
    try {
      return await this.prisma.conversationPromptAssetVersion.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`ConversationPromptAssetVersion with ID "${id}" not found for update.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<ConversationPromptAssetVersion> {
    try {
      // Considerar si eliminar una versión de asset debe tener lógica adicional
      return await this.prisma.conversationPromptAssetVersion.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`ConversationPromptAssetVersion with ID "${id}" not found`);
      }
      // P2003 podría ocurrir si hay traducciones o links asociados
      throw error;
    }
  }
}
