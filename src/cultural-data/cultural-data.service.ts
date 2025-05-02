import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCulturalDataDto } from './dto/create-cultural-data.dto';
import { UpdateCulturalDataDto } from './dto/update-cultural-data.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CulturalData } from '@prisma/client';

@Injectable()
export class CulturalDataService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateCulturalDataDto, projectId: string): Promise<CulturalData> {
        const { id, regionId, ...restData } = createDto;

        // Optional: Verify regionId belongs to the project first if necessary

        try {
            // Try setting projectId directly based on @map("project")
            return await this.prisma.culturalData.create({
                data: {
                    id: id,
                    regionId: regionId,
                    projectId: projectId, // Use direct field assignment
                    ...restData,
                },
                include: { region: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    // ID is global, conflict is not project-specific
                    throw new ConflictException(`CulturalData with ID "${id}" already exists.`);
                }
                if (error.code === 'P2025') {
                    // Could be Project or Region not found
                    throw new NotFoundException(`Project with ID "${projectId}" or Region with ID "${regionId}" not found.`);
                }
            }
            console.error(`Error creating CulturalData "${id}" in project ${projectId}:`, error);
            throw error;
        }
    }

    findAll(projectId: string): Promise<CulturalData[]> {
        return this.prisma.culturalData.findMany({
            where: { projectId }, // Filter by project
            include: { region: true }
        });
    }

    async findOne(id: string, projectId: string): Promise<CulturalData> {
        const culturalData = await this.prisma.culturalData.findFirst({
            where: { id, projectId }, // Find by id WITHIN the project
            include: { region: true },
        });
        if (!culturalData) {
            throw new NotFoundException(`CulturalData with ID "${id}" not found in project "${projectId}"`);
        }
        return culturalData;
    }

    async update(id: string, updateDto: UpdateCulturalDataDto, projectId: string): Promise<CulturalData> {
        // 1. Verify the data exists in the project first
        await this.findOne(id, projectId);

        // Assuming UpdateCulturalDataDto does NOT contain regionId
        const data: Prisma.CulturalDataUpdateInput = { ...updateDto };

        // Remove logic for updating region as regionId is not in UpdateCulturalDataDto
        // if (regionId) {
        //     data.region = { connect: { languageCode: regionId } };
        // }

        if (Object.keys(data).length === 0) {
            console.warn(`Update called for CulturalData "${id}" in project "${projectId}" with no data to change.`);
            return this.findOne(id, projectId);
        }

        try {
            // Update using the global ID, existence in project was verified
            return await this.prisma.culturalData.update({
                where: { id },
                data,
                include: { region: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`CulturalData with ID "${id}" not found during update.`);
            }
            console.error(`Error updating CulturalData "${id}" in project ${projectId}:`, error);
            throw error;
        }
    }

    async remove(id: string, projectId: string): Promise<CulturalData> {
        // 1. Verify it exists in the project and get data to return
        const culturalDataToDelete = await this.findOne(id, projectId);

        try {
            // Delete using the global ID, existence in project was verified
            await this.prisma.culturalData.delete({
                where: { id },
            });
            return culturalDataToDelete; // Return the data found before deletion
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`CulturalData with ID "${id}" not found during deletion.`);
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new ConflictException(`Cannot delete CulturalData "${id}" as it's still referenced by other entities.`);
            }
            console.error(`Error deleting CulturalData "${id}" in project ${projectId}:`, error);
            throw error;
        }
    }
}
