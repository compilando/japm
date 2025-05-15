import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateCulturalDataDto } from './dto/create-cultural-data.dto';
import { UpdateCulturalDataDto } from './dto/update-cultural-data.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CulturalData } from '@prisma/client';

@Injectable()
export class CulturalDataService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateCulturalDataDto,
    projectId: string,
  ): Promise<CulturalData> {
    const { key, regionId: regionLanguageCode, ...restData } = createDto;

    // Verificar si la Region existe y obtener su ID CUID
    // Asumimos que regionId en el DTO es el languageCode de la región para ese proyecto.
    const region = await this.prisma.region.findUnique({
      where: {
        projectId_languageCode: { projectId, languageCode: regionLanguageCode },
      },
      select: { id: true },
    });

    if (!region) {
      throw new NotFoundException(
        `Region with languageCode "${regionLanguageCode}" not found in project "${projectId}".`,
      );
    }

    try {
      return await this.prisma.culturalData.create({
        data: {
          ...restData,
          key: key,
          project: { connect: { id: projectId } },
          region: { connect: { id: region.id } }, // Conectar Region por su CUID id
        },
        include: { region: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // El target debería ser ['projectId', 'key']
          throw new ConflictException(
            `CulturalData with key "${key}" already exists in project "${projectId}".`,
          );
        } else if (error.code === 'P2025') {
          // Error de FK, e.g. project o region no existe (aunque region ya se verificó)
          throw new NotFoundException(
            `Data integrity error for CulturalData: ${error.message}. Ensure Project and Region exist.`,
          );
        }
      }
      console.error(
        `Error creating CulturalData with key "${key}" in project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  findAll(projectId: string): Promise<CulturalData[]> {
    return this.prisma.culturalData.findMany({
      where: { projectId },
      include: { region: true },
    });
  }

  // El 'id' en la ruta ahora será la 'key'
  async findOne(key: string, projectId: string): Promise<CulturalData> {
    const culturalData = await this.prisma.culturalData.findUnique({
      where: { projectId_key: { projectId, key } },
      include: { region: true },
    });
    if (!culturalData) {
      throw new NotFoundException(
        `CulturalData with key "${key}" not found in project "${projectId}"`,
      );
    }
    return culturalData;
  }

  // El 'id' en la ruta ahora será la 'key'
  async update(
    key: string,
    updateDto: UpdateCulturalDataDto,
    projectId: string,
  ): Promise<CulturalData> {
    // 1. Verificar que existe y obtener su CUID id
    const currentData = await this.findOne(key, projectId); // Esto ya valida que pertenece al proyecto

    // No permitir cambiar 'key', 'regionId', 'projectId' vía este método.
    // UpdateCulturalDataDto no debería tenerlos.
    const {
      key: dtoKey,
      regionId: dtoRegionId,
      projectId: dtoProjectId,
      tenantId: _omitTenantId,
      ...restUpdateData
    } = updateDto as any; // Se usa 'as any' si el DTO está bien definido y no los incluye.

    if (Object.keys(restUpdateData).length === 0) {
      return currentData; // Devolver el dato existente si no hay cambios
    }

    try {
      return await this.prisma.culturalData.update({
        where: { id: currentData.id }, // Actualizar por CUID id
        data: restUpdateData,
        include: { region: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `CulturalData with key "${key}" not found during update (P2025).`,
        );
      }
      console.error(
        `Error updating CulturalData with key "${key}" in project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  // El 'id' en la ruta ahora será la 'key'
  async remove(key: string, projectId: string): Promise<CulturalData> {
    // 1. Verificar que existe y obtener el objeto completo para devolverlo
    const culturalDataToDelete = await this.findOne(key, projectId); // Valida pertenencia al proyecto

    try {
      await this.prisma.culturalData.delete({
        where: { id: culturalDataToDelete.id }, // Eliminar por CUID id
      });
      return culturalDataToDelete;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `CulturalData with key "${key}" not found during deletion (P2025).`,
          );
        } else if (error.code === 'P2003') {
          // Foreign key constraint
          throw new ConflictException(
            `Cannot delete CulturalData with key "${key}" as it's referenced by other entities.`,
          );
        }
      }
      console.error(
        `Error deleting CulturalData with key "${key}" in project ${projectId}:`,
        error,
      );
      throw error;
    }
  }
}
