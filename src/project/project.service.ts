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
        const { name, owner, tenantId, ...otherProjectData } = createProjectDto;

        const slug = slugify(name);

        // Verificar si ya existe un proyecto con este slug
        const existingProject = await this.prisma.project.findFirst({
            where: { id: slug },
            select: { id: true, tenantId: true },
        });

        if (existingProject && existingProject.tenantId === tenantId) {
            throw new ConflictException(`A project with the generated ID (slug) '${slug}' already exists for this tenant. Please choose a different name.`);
        }

        try {
            return await this.prisma.project.create({
                data: {
                    id: slug,
                    name,
                    ...otherProjectData,
                    tenant: { connect: { id: tenantId } },
                    ...(owner && { owner: { connect: { id: owner } } }),
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Failed to create project due to a unique constraint violation (likely on ID '${slug}').`);
            }
            console.error(`Error creating project with slug "${slug}":`, error);
            throw error;
        }
    }

    async findAll(tenantId: string): Promise<Project[]> {
        // Filtrar manualmente por tenantId
        const projects = await this.prisma.project.findMany({ select: { id: true, name: true, tenantId: true } });
        return projects.filter(p => p.tenantId === tenantId) as Project[];
    }

    async findAllForUser(userId: string, tenantId: string): Promise<Pick<Project, 'id' | 'name'>[]> {
        // Filtrar manualmente por tenantId
        const projects = await this.prisma.project.findMany({
            where: { ownerUserId: userId },
            select: { id: true, name: true, tenantId: true },
            orderBy: { name: 'asc' },
        });
        return projects.filter(p => p.tenantId === tenantId).map(({ id, name }) => ({ id, name }));
    }

    async findOne(id: string, tenantId: string): Promise<Project> {
        const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, name: true, description: true, ownerUserId: true, createdAt: true, updatedAt: true, tenantId: true } });
        if (!project || project.tenantId !== tenantId) {
            throw new NotFoundException(`Project with ID "${id}" not found for this tenant`);
        }
        return project as Project;
    }

    async update(id: string, updateProjectDto: UpdateProjectDto, tenantId: string): Promise<Project> {
        const { owner, tenantId: _omitTenantId, ...projectData } = updateProjectDto;
        const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, tenantId: true } });
        if (!project || project.tenantId !== tenantId) {
            throw new NotFoundException(`Project with ID "${id}" not found for this tenant`);
        }
        try {
            return await this.prisma.project.update({
                where: { id },
                data: {
                    ...projectData,
                    ...(owner && { owner: { connect: { id: owner } } }),
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Project with ID "${id}" not found for this tenant`);
            }
            throw error;
        }
    }

    async remove(id: string, tenantId: string): Promise<Project> {
        const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, tenantId: true } });
        if (!project || project.tenantId !== tenantId) {
            throw new NotFoundException(`Project with ID "${id}" not found for this tenant`);
        }
        try {
            return await this.prisma.project.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Project with ID "${id}" not found for this tenant`);
            }
            throw error;
        }
    }
} 