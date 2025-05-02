import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Region } from '@prisma/client';

@Injectable()
export class RegionService {
    constructor(private prisma: PrismaService) { }

    async create(createRegionDto: CreateRegionDto, projectId: string): Promise<Region> {
        const { parentRegionId, ...restData } = createRegionDto;

        // Check if parent region exists *within the same project* if provided
        if (parentRegionId) {
            const parentExists = await this.prisma.region.findUnique({
                where: { languageCode: parentRegionId, projectId } // Check parent in same project
            });
            if (!parentExists) {
                throw new NotFoundException(`Parent Region with languageCode "${parentRegionId}" not found in project "${projectId}".`);
            }
        }

        // Use correct connect syntax for project
        const data: Prisma.RegionCreateInput = {
            ...restData,
            project: { connect: { id: projectId } }, // Correct way to connect project
            parentRegion: parentRegionId ? { connect: { languageCode: parentRegionId } } : undefined,
        };
        try {
            return await this.prisma.region.create({
                data,
                include: { culturalData: true, parentRegion: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Unique constraint is now (languageCode), assuming languageCode is globally unique despite project relation?
                // If languageCode should be unique PER PROJECT, the schema needs @@unique([projectId, languageCode])
                // and this check needs adjustment.
                if (error.code === 'P2002') {
                    // Check if error.meta.target exists and is an array before calling includes
                    if (error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('languageCode')) {
                        throw new ConflictException(`Region with languageCode "${restData.languageCode}" already exists.`);
                    } // Add checks for other unique constraints if needed
                } else if (error.code === 'P2025') {
                    // This specific P2025 might be less likely now due to the explicit parent check above
                    throw new NotFoundException(`Data integrity error: ${error.message}`);
                }
            }
            throw error;
        }
    }

    findAll(projectId: string): Promise<Region[]> {
        return this.prisma.region.findMany({
            where: { projectId }, // Filter by project
            include: { culturalData: true, parentRegion: true }
        });
    }

    async findOne(languageCode: string, projectId: string): Promise<Region> {
        const region = await this.prisma.region.findUnique({
            where: { languageCode, projectId }, // Filter by project and languageCode
            include: {
                culturalData: true,
                parentRegion: true,
            }
        });
        if (!region) {
            throw new NotFoundException(`Region with languageCode "${languageCode}" not found in project "${projectId}"`);
        }
        return region;
    }

    async update(languageCode: string, updateRegionDto: UpdateRegionDto, projectId: string): Promise<Region> {
        // Ensure the region to update exists within the project first
        await this.findOne(languageCode, projectId); // Re-uses findOne logic including not found check

        const { parentRegionId, ...restData } = updateRegionDto;

        // Check if parent region exists *within the same project* if provided
        if (parentRegionId !== undefined && parentRegionId !== null) {
            const parentExists = await this.prisma.region.findUnique({
                where: { languageCode: parentRegionId, projectId } // Check parent in same project
            });
            if (!parentExists) {
                throw new NotFoundException(`Parent Region with languageCode "${parentRegionId}" not found in project "${projectId}".`);
            }
        }

        const data: Prisma.RegionUpdateInput = {
            ...restData,
            // projectId: projectId, // Don't update projectId itself usually
            parentRegion: parentRegionId !== undefined ?
                (parentRegionId === null ? { disconnect: true } : { connect: { languageCode: parentRegionId } })
                : undefined,
        };

        try {
            // Update using the composite key ensures we only update the correct project's region
            // Note: Prisma doesn't directly support update by composite key easily, need to use findOne first (done above)
            // So we update by the primary key (languageCode) after verifying project ownership.
            return await this.prisma.region.update({
                where: { languageCode }, // Update by primary key
                data,
                include: { culturalData: true, parentRegion: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Error could be the region itself (unlikely due to findOne check) or the parent to connect
                throw new NotFoundException(`Data integrity error during update: ${error.message}`);
            }
            throw error;
        }
    }

    async remove(languageCode: string, projectId: string): Promise<Region> {
        return this.prisma.$transaction(async (tx) => {
            // Find the region within the specific project first to ensure ownership
            const region = await tx.region.findUnique({
                where: { languageCode, projectId },
                select: { languageCode: true } // Select only necessary field
            });

            if (!region) {
                throw new NotFoundException(`Region with languageCode "${languageCode}" not found in project "${projectId}"`);
            }

            // Delete associated CulturalData first (still assuming CulturalData belongs to the same project implicitly via Region)
            await tx.culturalData.deleteMany({
                where: { regionId: region.languageCode }
                // Could add projectId here too for extra safety if CulturalData has direct project FK
            });

            // Delete the region itself
            const deletedRegion = await tx.region.delete({
                where: { languageCode: region.languageCode }, // Delete by primary key
            });
            return deletedRegion;
        });
    }
}
