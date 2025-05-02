import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
// CreatePromptVersionDto import might be unused now if create method is removed.
// import { CreatePromptVersionDto } from '../prompt/dto/create-prompt-version.dto'; 
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptVersion } from '@prisma/client';

@Injectable()
export class PromptVersionService {
  constructor(private prisma: PrismaService) { }

  // Commented out create method removed below
  /*
  async create(createDto: CreatePromptVersionDto): Promise<PromptVersion> {
    // ... (code referencing non-existent promptId)
  }
  */

  findAll(): Promise<PromptVersion[]> {
    return this.prisma.promptVersion.findMany({
      include: { prompt: { select: { name: true } } } // Incluir nombre del prompt padre
    });
  }

  async findOne(id: string): Promise<PromptVersion> {
    const version = await this.prisma.promptVersion.findUnique({
      where: { id },
      include: {
        prompt: true,
        translations: true,
        assets: { include: { assetVersion: true } } // Incluir info del asset version ligado
      },
    });
    if (!version) {
      throw new NotFoundException(`PromptVersion with ID "${id}" not found`);
    }
    return version;
  }

  // Método útil para buscar versiones de un prompt específico
  findByPromptId(promptId: string): Promise<PromptVersion[]> {
    return this.prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { createdAt: 'desc' }, // Ordenar por fecha de creación descendente?
      include: { prompt: false } // No incluir prompt aquí ya que lo filtramos
    });
  }

  async update(id: string, updateDto: UpdatePromptVersionDto): Promise<PromptVersion> {
    // No permitir cambiar promptId o versionTag al actualizar.
    // UpdatePromptVersionDto ahora solo contiene los campos actualizables (promptText, changeMessage)
    // por lo que podemos pasarlo directamente o desestructurar solo esos.
    // const { promptText, changeMessage } = updateDto;
    // const updateData = { promptText, changeMessage };
    // O simplemente pasar updateDto si estamos seguros que SOLO contiene esos campos.
    const updateData = updateDto;

    try {
      return await this.prisma.promptVersion.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptVersion with ID "${id}" not found for update.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<PromptVersion> {
    try {
      // Eliminar una versión puede requerir lógica adicional
      // (e.g., asegurar que no sea la versión activa de un prompt?)
      // Por ahora, solo eliminamos.
      return await this.prisma.promptVersion.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`PromptVersion with ID "${id}" not found`);
      }
      // P2003 podría ocurrir si hay traducciones o links de assets asociados
      throw error;
    }
  }
}
