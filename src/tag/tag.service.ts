import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Tag } from '@prisma/client';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateTagDto): Promise<Tag> {
    try {
      return await this.prisma.tag.create({
        data: createDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed (name)
        if (error.code === 'P2002') {
          throw new ConflictException(`Ya existe una etiqueta con el nombre '${createDto.name}'`);
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<Tag[]> {
    return this.prisma.tag.findMany();
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });
    if (!tag) {
      throw new NotFoundException(`Etiqueta con ID '${id}' no encontrada.`);
    }
    return tag;
  }

  async findByName(name: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({
      where: { name },
    });
    if (!tag) {
      throw new NotFoundException(`Etiqueta con nombre '${name}' no encontrada.`);
    }
    return tag;
  }

  async update(id: string, updateDto: UpdateTagDto): Promise<Tag> {
    // Primero, verifica que la etiqueta exista
    await this.findOne(id);

    try {
      return await this.prisma.tag.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed (si se cambia el nombre a uno existente)
        if (error.code === 'P2002') {
          throw new ConflictException(`Ya existe una etiqueta con el nombre '${updateDto.name}'`);
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Tag> {
    // Primero, verifica que la etiqueta exista
    const tag = await this.findOne(id); // Reutilizamos para devolver el tag eliminado

    // Considerar la relación con Prompts: ¿Qué pasa si un tag está en uso?
    // Por defecto, Prisma no permitirá borrar si hay Prompts asociados.
    // Podrías añadir lógica aquí para desasociar los prompts o lanzar un error más específico.
    try {
      return await this.prisma.tag.delete({
        where: { id },
      });
    } catch (error) {
      // Podríamos manejar el error de restricción de clave foránea (P2003) aquí
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(`No se puede eliminar la etiqueta '${tag.name}' porque está asociada a uno o más prompts.`);
      }
      // P2025: Record to delete not found (ya cubierto por findOne)
      throw error;
    }
  }
}
