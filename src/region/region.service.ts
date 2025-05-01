import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Region } from '@prisma/client';

@Injectable()
export class RegionService {
    constructor(private prisma: PrismaService) { }

    async create(createRegionDto: CreateRegionDto): Promise<Region> {
        const { parentRegionId, ...restData } = createRegionDto;
        const data: Prisma.RegionCreateInput = {
            ...restData,
            parentRegion: parentRegionId ? { connect: { languageCode: parentRegionId } } : undefined,
        };
        try {
            return await this.prisma.region.create({
                data,
                include: { culturalData: true, parentRegion: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(`Region with languageCode "${restData.languageCode}" already exists.`);
                } else if (error.code === 'P2025') {
                    throw new NotFoundException(`Parent Region with languageCode "${parentRegionId}" not found.`);
                }
            }
            throw error;
        }
    }

    findAll(): Promise<Region[]> {
        return this.prisma.region.findMany({
            include: { culturalData: true, parentRegion: true }
        });
    }

    async findOne(languageCode: string): Promise<Region> {
        const region = await this.prisma.region.findUnique({
            where: { languageCode },
            include: {
                culturalData: true,
                parentRegion: true,
            }
        });
        if (!region) {
            throw new NotFoundException(`Region with languageCode "${languageCode}" not found`);
        }
        return region;
    }

    async update(languageCode: string, updateRegionDto: UpdateRegionDto): Promise<Region> {
        const { parentRegionId, ...restData } = updateRegionDto;
        const data: Prisma.RegionUpdateInput = {
            ...restData,
            parentRegion: parentRegionId !== undefined ?
                (parentRegionId === null ? { disconnect: true } : { connect: { languageCode: parentRegionId } })
                : undefined,
        };

        try {
            return await this.prisma.region.update({
                where: { languageCode },
                data,
                include: { culturalData: true, parentRegion: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Region with languageCode "${languageCode}" not found, or specified parentRegionId not found.`);
            }
            throw error;
        }
    }

    async remove(languageCode: string): Promise<Region> {
        return this.prisma.$transaction(async (tx) => {
            const region = await tx.region.findUniqueOrThrow({
                where: { languageCode },
                select: { languageCode: true }
            });

            await tx.culturalData.deleteMany({
                where: { regionId: region.languageCode }
            });

            const deletedRegion = await tx.region.delete({
                where: { languageCode: region.languageCode },
            });
            return deletedRegion;
        });
    }
}
