import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateRagDocumentMetadataDto } from './dto/create-rag-document-metadata.dto';
import { UpdateRagDocumentMetadataDto } from './dto/update-rag-document-metadata.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RagDocumentMetadata, Region } from '@prisma/client';

@Injectable()
export class RagDocumentMetadataService {
  constructor(private prisma: PrismaService) {}

  private async validateRegionOwnership(
    regionId: string,
    projectId: string,
  ): Promise<void> {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { projectId: true },
    });
    if (!region) {
      throw new NotFoundException(`Region with ID "${regionId}" not found.`);
    }
    if (region.projectId !== projectId) {
      throw new BadRequestException(
        `Region with ID "${regionId}" does not belong to project "${projectId}".`,
      );
    }
  }

  async create(
    createDto: CreateRagDocumentMetadataDto,
    projectId: string,
  ): Promise<RagDocumentMetadata> {
    const { regionId, documentName, ...restData } = createDto;

    const existingDoc = await this.prisma.ragDocumentMetadata.findFirst({
      where: { projectId, documentName },
    });
    if (existingDoc) {
      throw new ConflictException(
        `A RagDocumentMetadata with documentName "${documentName}" already exists in project "${projectId}".`,
      );
    }

    if (regionId) {
      await this.validateRegionOwnership(regionId, projectId);
    }

    const data: Prisma.RagDocumentMetadataUncheckedCreateInput = {
      ...restData,
      documentName,
      projectId: projectId,
      regionId: regionId,
    };

    try {
      return await this.prisma.ragDocumentMetadata.create({
        data,
        include: { region: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `RagDocumentMetadata creation failed due to a unique constraint. Likely on documentName for this project.`,
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Failed to create RAG metadata: Referenced project or region not found.`,
          );
        }
      }
      console.error(
        `Error creating RAG metadata for document "${documentName}" in project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  findAll(projectId: string): Promise<RagDocumentMetadata[]> {
    return this.prisma.ragDocumentMetadata.findMany({
      where: { projectId },
      include: { region: true },
    });
  }

  async findOne(id: string, projectId: string): Promise<RagDocumentMetadata> {
    const metadata = await this.prisma.ragDocumentMetadata.findUnique({
      where: { id },
      include: { region: true },
    });
    if (!metadata || metadata.projectId !== projectId) {
      throw new NotFoundException(
        `RagDocumentMetadata with ID "${id}" not found in project "${projectId}".`,
      );
    }
    return metadata;
  }

  async update(
    id: string,
    updateDto: UpdateRagDocumentMetadataDto,
    projectId: string,
  ): Promise<RagDocumentMetadata> {
    const existingMetadata = await this.findOne(id, projectId);

    const { regionId, documentName, ...restData } = updateDto;

    if (documentName && documentName !== existingMetadata.documentName) {
      const conflictingDoc = await this.prisma.ragDocumentMetadata.findFirst({
        where: { projectId, documentName },
      });
      if (conflictingDoc) {
        throw new ConflictException(
          `A RagDocumentMetadata with documentName "${documentName}" already exists in project "${projectId}".`,
        );
      }
    }

    const data: Prisma.RagDocumentMetadataUpdateInput = { ...restData };
    if (documentName) {
      data.documentName = documentName;
    }

    if (regionId !== undefined) {
      if (regionId === null) {
        data.region = { disconnect: true };
      } else {
        await this.validateRegionOwnership(regionId, projectId);
        data.region = { connect: { id: regionId } };
      }
    }

    if (
      Object.keys(data).length === 0 &&
      regionId === undefined &&
      documentName === undefined
    ) {
      return existingMetadata;
    }

    try {
      return await this.prisma.ragDocumentMetadata.update({
        where: { id: existingMetadata.id },
        data,
        include: { region: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        const message =
          error.meta?.cause ??
          `Record to update not found or related region not found. Ensure IDs are CUIDs.`;
        throw new NotFoundException(String(message));
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Update failed due to a unique constraint violation. Likely on documentName for this project.`,
        );
      }
      console.error(
        `Error updating RAG Metadata "${id}" in project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  async remove(id: string, projectId: string): Promise<RagDocumentMetadata> {
    const metadataToDelete = await this.findOne(id, projectId);

    try {
      await this.prisma.ragDocumentMetadata.delete({
        where: { id: metadataToDelete.id },
      });
      return metadataToDelete;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `RagDocumentMetadata with ID "${id}" not found during deletion.`,
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          `Cannot delete RAG Metadata "${id}" as it's still referenced.`,
        );
      }
      console.error(
        `Error deleting RAG metadata "${id}" in project ${projectId}:`,
        error,
      );
      throw error;
    }
  }
}
