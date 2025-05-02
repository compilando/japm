import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateRagDocumentMetadataDto } from './dto/create-rag-document-metadata.dto';
import { UpdateRagDocumentMetadataDto } from './dto/update-rag-document-metadata.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RagDocumentMetadata } from '@prisma/client';

@Injectable()
export class RagDocumentMetadataService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateRagDocumentMetadataDto, projectId: string): Promise<RagDocumentMetadata> {
        const { regionId, ...restData } = createDto;
        const data: Prisma.RagDocumentMetadataUncheckedCreateInput = {
            ...restData,
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
                    throw new ConflictException(`A RagDocumentMetadata with conflicting unique fields already exists.`);
                }
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Project with ID "${projectId}" or Region with ID "${regionId}" not found.`);
                }
            }
            console.error(`Error creating RAG metadata in project ${projectId}:`, error);
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
        const metadata = await this.prisma.ragDocumentMetadata.findFirst({
            where: { id, projectId },
            include: { region: true },
        });
        if (!metadata) {
            throw new NotFoundException(`RagDocumentMetadata with ID "${id}" not found in project "${projectId}"`);
        }
        return metadata;
    }

    async update(id: string, updateDto: UpdateRagDocumentMetadataDto, projectId: string): Promise<RagDocumentMetadata> {
        await this.findOne(id, projectId);

        const { regionId, ...restData } = updateDto;
        const data: Prisma.RagDocumentMetadataUpdateInput = { ...restData };

        if (regionId !== undefined) {
            data.region = regionId ? { connect: { languageCode: regionId } } : { disconnect: true };
        }

        if (Object.keys(data).length === 0 && regionId === undefined) {
            console.warn(`Update called for RAG Metadata "${id}" in project "${projectId}" with no data to change.`);
            return this.findOne(id, projectId);
        }

        try {
            return await this.prisma.ragDocumentMetadata.update({
                where: { id },
                data,
                include: { region: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                const message = error.meta?.cause ?? `Record to update not found or related region not found.`;
                throw new NotFoundException(String(message));
            }
            throw error;
        }
    }

    async remove(id: string, projectId: string): Promise<RagDocumentMetadata> {
        const metadataToDelete = await this.findOne(id, projectId);

        try {
            await this.prisma.ragDocumentMetadata.delete({
                where: { id },
            });
            return metadataToDelete;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`RagDocumentMetadata with ID "${id}" not found during deletion.`);
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new ConflictException(`Cannot delete RAG Metadata "${id}" as it's still referenced.`);
            }
            console.error(`Error deleting RAG metadata "${id}" in project ${projectId}:`, error);
            throw error;
        }
    }
} 