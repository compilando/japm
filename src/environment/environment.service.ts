import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta si es necesario
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { Environment } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class EnvironmentService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateEnvironmentDto): Promise<Environment> {
        try {
            return await this.prisma.environment.create({
                data: createDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Código P2002: Unique constraint failed
                if (error.code === 'P2002') {
                    throw new ConflictException(`Ya existe un entorno con el nombre '${createDto.name}'`);
                }
            }
            throw error; // Re-lanzar otros errores
        }
    }

    async findAll(): Promise<Environment[]> {
        return this.prisma.environment.findMany();
    }

    async findOne(id: string): Promise<Environment> {
        const environment = await this.prisma.environment.findUnique({
            where: { id },
        });
        if (!environment) {
            throw new NotFoundException(`Entorno con ID '${id}' no encontrado.`);
        }
        return environment;
    }

    // Podríamos añadir un findByName si el nombre es más usado que el ID
    async findByName(name: string): Promise<Environment> {
        const environment = await this.prisma.environment.findUnique({
            where: { name },
        });
        if (!environment) {
            throw new NotFoundException(`Entorno con nombre '${name}' no encontrado.`);
        }
        return environment;
    }


    async update(id: string, updateDto: UpdateEnvironmentDto): Promise<Environment> {
        try {
            return await this.prisma.environment.update({
                where: { id },
                data: updateDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') { // Record to update not found
                    throw new NotFoundException(`Entorno con ID '${id}' no encontrado para actualizar.`);
                }
                if (error.code === 'P2002') { // Unique constraint failed (si se cambia el nombre a uno existente)
                    throw new ConflictException(`Ya existe un entorno con el nombre '${updateDto.name}'`);
                }
            }
            throw error;
        }
    }

    async remove(id: string): Promise<Environment> {
        try {
            return await this.prisma.environment.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') { // Record to delete does not exist
                    throw new NotFoundException(`Entorno con ID '${id}' no encontrado para eliminar.`);
                }
            }
            throw error;
        }
    }
} 