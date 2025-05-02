import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta si es necesario
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { Environment } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class EnvironmentService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateEnvironmentDto, projectId: string): Promise<Environment> {
        try {
            return await this.prisma.environment.create({
                data: {
                    ...createDto,
                    project: { connect: { id: projectId } } // Conectar al proyecto
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Código P2002: Unique constraint failed
                // El constraint es ahora @@unique([projectId, name])
                if (error.code === 'P2002' && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('name') && error.meta.target.includes('projectId')) {
                    throw new ConflictException(`Ya existe un entorno con el nombre '${createDto.name}' en este proyecto.`);
                }
            }
            throw error; // Re-lanzar otros errores
        }
    }

    async findAll(projectId: string): Promise<Environment[]> {
        return this.prisma.environment.findMany({
            where: { projectId } // Filtrar por proyecto
        });
    }

    async findOne(id: string, projectId: string): Promise<Environment> {
        // Buscamos por ID y verificamos que pertenezca al proyecto
        const environment = await this.prisma.environment.findFirst({
            where: { id, projectId },
        });
        if (!environment) {
            throw new NotFoundException(`Entorno con ID '${id}' no encontrado en el proyecto '${projectId}'.`);
        }
        return environment;
    }

    // findByName ahora necesita projectId debido al constraint @@unique([projectId, name])
    async findByName(name: string, projectId: string): Promise<Environment> {
        const environment = await this.prisma.environment.findUnique({
            where: {
                projectId_name: { projectId, name } // Usar el índice compuesto
            },
        });
        if (!environment) {
            throw new NotFoundException(`Entorno con nombre '${name}' no encontrado en el proyecto '${projectId}'.`);
        }
        return environment;
    }


    async update(id: string, updateDto: UpdateEnvironmentDto, projectId: string): Promise<Environment> {
        // 1. Verificar que el entorno existe en este proyecto
        await this.findOne(id, projectId); // Reutiliza la lógica y lanza NotFound si no existe

        try {
            // 2. Actualizar por ID (ya sabemos que pertenece al proyecto)
            return await this.prisma.environment.update({
                where: { id }, // Actualizar usando el ID único global
                data: updateDto, // No necesitamos incluir projectId aquí, no se debe cambiar
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // P2025 no debería ocurrir gracias a findOne, pero lo dejamos por seguridad
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Entorno con ID '${id}' no encontrado para actualizar (error inesperado).`);
                }
                // P2002 para el constraint [projectId, name]
                if (error.code === 'P2002' && updateDto.name && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('name') && error.meta.target.includes('projectId')) {
                    throw new ConflictException(`Ya existe un entorno con el nombre '${updateDto.name}' en este proyecto.`);
                }
            }
            throw error;
        }
    }

    async remove(id: string, projectId: string): Promise<Environment> {
        // 1. Verificar que el entorno existe en este proyecto
        const environment = await this.findOne(id, projectId); // Reutiliza la lógica y lanza NotFound si no existe

        // 2. Eliminar por ID (ya sabemos que pertenece al proyecto)
        // No necesitamos try-catch para P2025 aquí porque findOne ya lo verificó.
        // Si hubiera relaciones dependientes que bloquearan el delete (sin onDelete: Cascade),
        // Prisma lanzaría un P2003 (Foreign key constraint failed) o similar.
        return await this.prisma.environment.delete({
            where: { id },
        });
        // Nota: Si hubiera datos asociados que deben borrarse manualmente, se haría en una transacción.
    }
}