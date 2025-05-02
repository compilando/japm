import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Tag } from '@prisma/client';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateTagDto, projectId: string): Promise<Tag> {
    try {
      return await this.prisma.tag.create({
        data: {
          ...createDto,
          project: { connect: { id: projectId } } // Conectar al proyecto
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed (projectId, name)
        if (error.code === 'P2002' && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('name') && error.meta.target.includes('projectId')) {
          throw new ConflictException(`Ya existe una etiqueta con el nombre '${createDto.name}' en este proyecto.`);
        }
      }
      throw error;
    }
  }

  async findAll(projectId: string): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: { projectId } // Filtrar por proyecto
    });
  }

  async findOne(id: string, projectId: string): Promise<Tag> {
    // Buscar por ID y verificar que pertenece al proyecto
    const tag = await this.prisma.tag.findFirst({
      where: { id, projectId },
    });
    if (!tag) {
      throw new NotFoundException(`Etiqueta con ID '${id}' no encontrada en el proyecto '${projectId}'.`);
    }
    return tag;
  }

  // findByName necesita projectId debido al constraint @@unique([projectId, name])
  async findByName(name: string, projectId: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({
      where: {
        projectId_name: { projectId, name } // Usar el índice compuesto
      },
    });
    if (!tag) {
      throw new NotFoundException(`Etiqueta con nombre '${name}' no encontrada en el proyecto '${projectId}'.`);
    }
    return tag;
  }

  async update(id: string, updateDto: UpdateTagDto, projectId: string): Promise<Tag> {
    // 1. Verificar que la etiqueta existe en este proyecto
    await this.findOne(id, projectId);

    try {
      // 2. Actualizar por ID
      return await this.prisma.tag.update({
        where: { id }, // Actualizar por ID único global
        data: updateDto, // projectId no se debe actualizar aquí
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 para el constraint [projectId, name]
        if (error.code === 'P2002' && updateDto.name && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('name') && error.meta.target.includes('projectId')) {
          throw new ConflictException(`Ya existe una etiqueta con el nombre '${updateDto.name}' en este proyecto.`);
        }
        // P2025 no debería ocurrir gracias a findOne
      }
      throw error;
    }
  }

  async remove(id: string, projectId: string): Promise<Tag> {
    // 1. Verificar que la etiqueta existe en este proyecto
    const tag = await this.findOne(id, projectId); // Lanza NotFound si no existe

    // 2. Intentar eliminar por ID
    try {
      return await this.prisma.tag.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        // Foreign key constraint failed (p.ej., tag asociado a PromptVersion)
        throw new ConflictException(`No se puede eliminar la etiqueta '${tag.name}' (ID: ${id}) porque está asociada a otros elementos en el proyecto '${projectId}'.`);
      }
      // P2025 (Not found) ya está cubierto por findOne
      throw error;
    }
  }
}
