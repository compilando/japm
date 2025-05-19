import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectDto } from './dto/project.dto';
import { Logger } from '@nestjs/common';
import { Project, Prisma } from '@prisma/client';

// Función simple para generar slugs
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios con -
    .replace(/[^\w\-]+/g, '') // Eliminar caracteres no alfanuméricos excepto -
    .replace(/\-\-+/g, '-'); // Reemplazar múltiples - con uno solo
}

// Define a type for Project with Regions included
type ProjectWithRegions = Prisma.ProjectGetPayload<{
  include: { regions: true };
}>;

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private prisma: PrismaService) { }

  private transformProject(project: Project): ProjectDto {
    return {
      ...project,
      description: project.description || undefined
    };
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
    tenantId: string,
  ): Promise<ProjectDto> {
    const { name, description } = createProjectDto;

    const slug = slugify(name);

    const existingProject = await this.prisma.project.findFirst({
      where: { id: slug, tenantId: tenantId },
      select: { id: true },
    });

    if (existingProject) {
      throw new ConflictException(
        `A project with the generated ID (slug) '${slug}' already exists for this tenant. Please choose a different name.`,
      );
    }

    try {
      const project = await this.prisma.project.create({
        data: {
          id: slug,
          name,
          description,
          tenant: { connect: { id: tenantId } },
          owner: { connect: { id: userId } },
        },
      });
      return this.transformProject(project);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Failed to create project due to a unique constraint violation (likely on ID '${slug}').`,
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.error(
          `Foreign key constraint failed creating project '${slug}'. Invalid userId '${userId}' or tenantId '${tenantId}'?`,
          error.meta,
        );
        throw new NotFoundException('Referenced owner or tenant not found.');
      }
      console.error(`Error creating project with slug "${slug}":`, error);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
  ): Promise<ProjectDto[]> {
    console.log(`[Service] Finding projects for tenant: ${tenantId}`); // Log de depuración
    const projects = await this.prisma.project.findMany({
      where: { tenantId: tenantId }, // Filtrar directamente en la query por tenantId
    });
    return projects.map(this.transformProject);
  }

  async findAllForUser(
    userId: string,
    tenantId: string,
  ): Promise<Pick<Project, 'id' | 'name'>[]> {
    this.logger.debug(
      `[Service] Finding projects for user: ${userId} in tenant: ${tenantId}`,
    );
    return this.prisma.project.findMany({
      where: {
        ownerUserId: userId,
        tenantId: tenantId,
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ProjectDto> {
    const project = await this.prisma.project.findFirstOrThrow({
      where: {
        id,
        tenantId,
      },
    });
    return this.transformProject(project);
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    tenantId: string,
  ): Promise<ProjectDto> {
    await this.findOne(id, tenantId);

    try {
      const project = await this.prisma.project.update({
        where: {
          id,
          tenantId,
        },
        data: updateProjectDto,
      });
      return this.transformProject(project);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.error(
          `Error P2025 updating project '${id}': ${error.message}`,
          error.meta,
        );
        throw new NotFoundException(
          `Update failed. Ensure all related entities exist.`,
        );
      }
      this.logger.error(
        `Error updating project '${id}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.prisma.project.delete({
      where: {
        id,
        tenantId,
      },
    });
  }
}
