import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, Prisma } from '@prisma/client';

// Función simple para generar slugs
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Reemplazar espacios con -
        .replace(/[^\w\-]+/g, '')    // Eliminar caracteres no alfanuméricos excepto -
        .replace(/\-\-+/g, '-');       // Reemplazar múltiples - con uno solo
}

@Injectable()
export class ProjectService {
    constructor(private prisma: PrismaService) { }

    async create(createProjectDto: CreateProjectDto): Promise<Project> {
        const { name, owner, ...otherProjectData } = createProjectDto;

        const slug = slugify(name);

        // Verificar si ya existe un proyecto con este slug
        const existingProject = await this.prisma.project.findUnique({
            where: { id: slug },
        });

        if (existingProject) {
            // Podríamos implementar lógica para añadir sufijos numéricos aquí si se desea
            // Por ahora, lanzamos un conflicto.
            throw new ConflictException(`A project with the generated ID (slug) '${slug}' already exists. Please choose a different name.`);
        }

        try {
            return await this.prisma.project.create({
                data: {
                    id: slug, // Usar el slug generado como ID
                    name,     // Usar el nombre original
                    ...otherProjectData, // description
                    ...(owner && { owner: { connect: { id: owner } } }),
                },
            });
        } catch (error) {
            // Manejar otros posibles errores, aunque P2002 (unique constraint) para 'id'
            // debería ser capturado por la verificación explícita anterior.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Failed to create project due to a unique constraint violation (likely on ID '${slug}').`);
            }
            console.error(`Error creating project with slug "${slug}":`, error);
            throw error;
        }
    }

    async findAll(): Promise<Project[]> {
        return this.prisma.project.findMany();
    }

    async findAllForUser(userId: string): Promise<Pick<Project, 'id' | 'name'>[]> {
        return this.prisma.project.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    async findOne(id: string): Promise<Project> {
        const project = await this.prisma.project.findUnique({
            where: { id },
        });
        if (!project) {
            throw new NotFoundException(`Project with ID "${id}" not found`);
        }
        return project;
    }

    async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
        const { owner, ...projectData } = updateProjectDto;
        try {
            return await this.prisma.project.update({
                where: { id },
                data: {
                    ...projectData,
                    ...(owner && { owner: { connect: { id: owner } } }),
                    // Si se permite desconectar owner, añadir: ...(owner === null && { owner: { disconnect: true } })
                    // Note: If owner can be explicitly set to null to disconnect, the logic might need adjustment
                    // based on whether 'owner' in UpdateProjectDto being undefined means "no change" or "disconnect".
                    // Current logic: if 'owner' is provided, connect it. If it's not provided (undefined), owner relationship is not touched.
                },
            });
        } catch (error) {
            // Podría ser PrismaClientKnownRequestError P2025 si el project no existe
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Project with ID "${id}" not found`);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<Project> {
        try {
            return await this.prisma.project.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Project with ID "${id}" not found`);
            }
            throw error;
        }
    }
} 