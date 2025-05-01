import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Tag } from '@prisma/client';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) { }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    try {
      return await this.prisma.tag.create({
        data: createTagDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // P2002 puede ser por 'id' (si no usara default) o por 'name' (@unique)
        throw new ConflictException(`Tag with name "${createTagDto.name}" already exists.`);
      }
      throw error;
    }
  }

  findAll(): Promise<Tag[]> {
    // Excluir prompts por defecto para no cargar demasiados datos
    return this.prisma.tag.findMany({ include: { prompts: false } });
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { prompts: true }, // Incluir prompts al buscar uno específico
    });
    if (!tag) {
      throw new NotFoundException(`Tag with ID "${id}" not found`);
    }
    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    try {
      return await this.prisma.tag.update({
        where: { id },
        data: updateTagDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') { // Unicidad de 'name'
          throw new ConflictException(`Tag with name "${updateTagDto.name}" already exists.`);
        }
        if (error.code === 'P2025') { // Registro no encontrado para actualizar
          throw new NotFoundException(`Tag with ID "${id}" not found for update.`);
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Tag> {
    try {
      // Nota: La relación con Prompts es muchos-a-muchos.
      // Eliminar un Tag no requiere desconectar manualmente los Prompts.
      // Prisma maneja la tabla de unión implícita.
      return await this.prisma.tag.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Tag with ID "${id}" not found`);
      }
      throw error;
    }
  }
}
