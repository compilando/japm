import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

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

  constructor(private prisma: PrismaService) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
    tenantId: string,
  ): Promise<Project> {
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
      return await this.prisma.project.create({
        data: {
          id: slug,
          name,
          description,
          tenant: { connect: { id: tenantId } },
          owner: { connect: { id: userId } },
        },
      });
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
  ): Promise<Pick<Project, 'id' | 'name' | 'description' | 'tenantId'>[]> {
    console.log(`[Service] Finding projects for tenant: ${tenantId}`); // Log de depuración
    return this.prisma.project.findMany({
      where: { tenantId: tenantId }, // Filtrar directamente en la query por tenantId
      select: {
        id: true,
        name: true,
        description: true,
        tenantId: true /* Otros campos necesarios */,
      },
    });
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

  async findOne(id: string, tenantId: string): Promise<ProjectWithRegions> {
    const project = await this.prisma.project.findUnique({
      where: { id: id },
      include: {
        regions: true,
      },
    });

    if (!project || project.tenantId !== tenantId) {
      throw new NotFoundException(
        `Project with ID "${id}" not found for tenant "${tenantId}".`,
      );
    }
    return project as ProjectWithRegions;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    tenantId: string,
  ): Promise<Project> {
    await this.findOne(id, tenantId);

    try {
      return await this.prisma.project.update({
        where: { id: id },
        data: updateProjectDto,
      });
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

  async remove(id: string, tenantId: string): Promise<Project> {
    await this.findOne(id, tenantId);

    try {
      return await this.prisma.project.delete({
        where: { id: id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.error(
          `Error P2025 deleting project '${id}': ${error.message}`,
          error.meta,
        );
        throw new NotFoundException(
          `Delete failed. Project with ID "${id}" may have already been deleted.`,
        );
      }
      this.logger.error(
        `Error deleting project '${id}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
