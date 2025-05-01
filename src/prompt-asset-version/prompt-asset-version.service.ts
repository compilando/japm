import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAssetVersion } from '@prisma/client';

@Injectable()
export class PromptAssetVersionService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    const { assetId, value, versionTag, changeMessage } = createDto;
    // TODO: Validar que assetId existe?
    try {
      return await this.prisma.promptAssetVersion.create({
        data: {
          value,
          versionTag,
          changeMessage,
          asset: { connect: { key: assetId } },
        },
        include: { asset: true } // Incluir el asset padre
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') { // Unique constraint (assetId + versionTag)
          throw new ConflictException(`Version with tag "${versionTag}" already exists for asset "${assetId}".`);
        } else if (error.code === 'P2025') { // Asset no encontrado
          throw new NotFoundException(`Asset with key "${assetId}" not found.`);
        }
      }
      throw error;
    }
  }

  findAll(): Promise<PromptAssetVersion[]> {
    return this.prisma.promptAssetVersion.findMany({
      include: { asset: true, translations: true, links: true }, // Incluir relaciones
    });
  }

  async findOne(id: string): Promise<PromptAssetVersion> {
    const version = await this.prisma.promptAssetVersion.findUnique({
      where: { id },
      include: { asset: true, translations: true, links: { include: { promptVersion: true } } },
    });
    if (!version) {
      throw new NotFoundException(`PromptAssetVersion with ID "${id}" not found`);
    }
    return version;
  }

  // Método útil para buscar versiones de un asset específico
  findByAssetId(assetId: string): Promise<PromptAssetVersion[]> {
    return this.prisma.promptAssetVersion.findMany({
      where: { assetId },
      include: { translations: true }, // No incluir asset aquí para evitar redundancia
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateDto: UpdatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    // Solo actualizar value y changeMessage
    try {
      return await this.prisma.promptAssetVersion.update({
        where: { id },
        data: updateDto,
        include: { asset: true } // Incluir asset padre
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptAssetVersion with ID "${id}" not found for update.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<PromptAssetVersion> {
    // TODO: Considerar qué pasa con links y traducciones (onDelete cascade?)
    try {
      return await this.prisma.promptAssetVersion.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptAssetVersion with ID "${id}" not found`);
      }
      throw error;
    }
  }
}
