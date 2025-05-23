import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { Environment } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class EnvironmentService {
  constructor(private prisma: PrismaService) { }

  async create(
    createDto: CreateEnvironmentDto,
    projectId: string,
  ): Promise<Environment> {
    try {
      const { tenantId, ...dataToCreate } = createDto as any; // Exclude tenantId explicitly
      return await this.prisma.environment.create({
        data: {
          ...dataToCreate, // Use filtered data
          project: { connect: { id: projectId } }, // Connect to the project
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 code: Unique constraint failed
        // The constraint is now @@unique([projectId, name]) but the field names in meta.target are 'project' and 'name'
        if (
          error.code === 'P2002' &&
          error.meta?.target &&
          Array.isArray(error.meta.target) &&
          error.meta.target.includes('name') &&
          error.meta.target.includes('project')
        ) {
          throw new ConflictException(
            `An environment with the name '${createDto.name}' already exists in this project.`,
          );
        }
      }
      throw error; // Re-throw other errors
    }
  }

  async findAll(projectId: string): Promise<Environment[]> {
    return this.prisma.environment.findMany({
      where: { projectId }, // Filter by project
    });
  }

  async findOne(id: string, projectId: string): Promise<Environment> {
    // Search by ID and verify it belongs to the project
    const environment = await this.prisma.environment.findFirst({
      where: { id, projectId },
    });
    if (!environment) {
      throw new NotFoundException(
        `Environment with ID '${id}' not found in project '${projectId}'.`,
      );
    }
    return environment;
  }

  // findByName now needs projectId due to the @@unique([projectId, name]) constraint
  async findByName(name: string, projectId: string): Promise<Environment> {
    const environment = await this.prisma.environment.findUnique({
      where: {
        projectId_name: { projectId, name }, // Use the composite index
      },
    });
    if (!environment) {
      throw new NotFoundException(
        `Environment with name '${name}' not found in project '${projectId}'.`,
      );
    }
    return environment;
  }

  async update(
    id: string,
    updateDto: UpdateEnvironmentDto,
    projectId: string,
  ): Promise<Environment> {
    await this.findOne(id, projectId);
    const { tenantId, ...data } = updateDto as any; // Omitir tenantId si viene
    try {
      return await this.prisma.environment.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025 shouldn't happen thanks to findOne, but kept for safety
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Environment with ID '${id}' not found for update (unexpected error).`,
          );
        }
        // P2002 for the [projectId, name] constraint
        if (
          error.code === 'P2002' &&
          updateDto.name &&
          error.meta?.target &&
          Array.isArray(error.meta.target) &&
          error.meta.target.includes('name') &&
          error.meta.target.includes('project')
        ) {
          throw new ConflictException(
            `An environment with the name '${updateDto.name}' already exists in this project.`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string, projectId: string): Promise<Environment> {
    // 1. Verify that the environment exists in this project
    const environment = await this.findOne(id, projectId); // Reuses logic and throws NotFound if it doesn't exist

    // 2. Delete by ID (we already know it belongs to the project)
    // We don't need try-catch for P2025 here because findOne already checked.
    // If there were dependent relations blocking the delete (without onDelete: Cascade),
    // Prisma would throw a P2003 (Foreign key constraint failed) or similar.
    return await this.prisma.environment.delete({
      where: { id },
    });
    // Note: If associated data needed manual deletion, it would be done in a transaction.
  }
}
