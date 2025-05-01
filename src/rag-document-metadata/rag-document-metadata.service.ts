import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRagDocumentMetadataDto } from './dto/create-rag-document-metadata.dto';
import { UpdateRagDocumentMetadataDto } from './dto/update-rag-document-metadata.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RagDocumentMetadata } from '@prisma/client';

@Injectable()
export class RagDocumentMetadataService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateRagDocumentMetadataDto): Promise<RagDocumentMetadata> {
        const { regionId, ...restData } = createDto;
        let data: Prisma.RagDocumentMetadataCreateInput = { ...restData };

        if (regionId) {
            data.region = { connect: { languageCode: regionId } };
        }

        try {
            return await this.prisma.ragDocumentMetadata.create({
                data,
                include: { region: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Referenced region with ID "${regionId}" not found.`);
            }
            // P2002 si hubiera un campo unique además del ID (CUID)
            throw error;
        }
    }

    findAll(): Promise<RagDocumentMetadata[]> {
        return this.prisma.ragDocumentMetadata.findMany({
            include: { region: true },
        });
    }

    async findOne(id: string): Promise<RagDocumentMetadata> {
        const metadata = await this.prisma.ragDocumentMetadata.findUnique({
            where: { id },
            include: { region: true },
        });
        if (!metadata) {
            throw new NotFoundException(`RagDocumentMetadata with ID "${id}" not found`);
        }
        return metadata;
    }

    async update(id: string, updateDto: UpdateRagDocumentMetadataDto): Promise<RagDocumentMetadata> {
        const { regionId, ...restData } = updateDto;
        let data: Prisma.RagDocumentMetadataUpdateInput = { ...restData };

        if (regionId !== undefined) {
            data.region = regionId ? { connect: { languageCode: regionId } } : { disconnect: true };
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

    async remove(id: string): Promise<RagDocumentMetadata> {
        try {
            return await this.prisma.ragDocumentMetadata.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`RagDocumentMetadata with ID "${id}" not found`);
            }
            throw error;
        }
    }
} 