import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptVersion } from '@prisma/client';

@Injectable()
export class PromptVersionService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreatePromptVersionDto): Promise<PromptVersion> {
    const { promptId, ...restData } = createDto;
    try {
      return await this.prisma.promptVersion.create({
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

  findAll(): Promise<PromptVersion[]> {
    // Considerar paginación o filtrado si la lista crece mucho
    // Excluir relaciones complejas por defecto?
    return this.prisma.promptVersion.findMany({
      include: { prompt: true } // Incluir el prompt lógico asociado
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
