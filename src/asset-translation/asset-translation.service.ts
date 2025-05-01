import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAssetTranslationDto } from './dto/create-asset-translation.dto';
import { UpdateAssetTranslationDto } from './dto/update-asset-translation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssetTranslation } from '@prisma/client';

@Injectable()
export class AssetTranslationService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateAssetTranslationDto): Promise<AssetTranslation> {
    const { versionId, languageCode, value } = createDto;
    try {
      return await this.prisma.assetTranslation.create({
        data: {
          value,
          languageCode,
          version: { // Conectar a la versión del asset
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
        if (error.code === 'P2025') { // Versión del asset no encontrada
          throw new NotFoundException(`ConversationPromptAssetVersion with ID "${versionId}" not found.`);
        }
      }
      throw error;
    }
  }

  findAll(): Promise<AssetTranslation[]> {
    return this.prisma.assetTranslation.findMany({ include: { version: true } });
  }

  // Método útil para buscar traducciones de una versión específica
  findByVersionId(versionId: string): Promise<AssetTranslation[]> {
    return this.prisma.assetTranslation.findMany({
      where: { versionId },
      include: { version: false }
    });
  }

  async findOne(id: string): Promise<AssetTranslation> {
    const translation = await this.prisma.assetTranslation.findUnique({
      where: { id },
      include: { version: { include: { asset: true } } } // Incluir versión y asset lógico
    });
    if (!translation) {
      throw new NotFoundException(`AssetTranslation with ID "${id}" not found`);
    }
    return translation;
  }

  async findOneByVersionAndLanguage(versionId: string, languageCode: string): Promise<AssetTranslation | null> {
    return this.prisma.assetTranslation.findUnique({
      where: { versionId_languageCode: { versionId, languageCode } },
      include: { version: false }
    });
  }

  async update(id: string, updateDto: UpdateAssetTranslationDto): Promise<AssetTranslation> {
    // Solo se actualiza value
    try {
      return await this.prisma.assetTranslation.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`AssetTranslation with ID "${id}" not found for update.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<AssetTranslation> {
    try {
      return await this.prisma.assetTranslation.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`AssetTranslation with ID "${id}" not found`);
      }
      throw error;
    }
  }
}
