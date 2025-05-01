import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCulturalDataDto } from './dto/create-cultural-data.dto';
import { UpdateCulturalDataDto } from './dto/update-cultural-data.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CulturalData } from '@prisma/client';

@Injectable()
export class CulturalDataService {
    constructor(private prisma: PrismaService) { }

    async create(createCulturalDataDto: CreateCulturalDataDto): Promise<CulturalData> {
        const { id, regionId, ...restData } = createCulturalDataDto;

        try {
            return await this.prisma.culturalData.create({
                data: {
                    id: id,
                    regionId: regionId,
                    ...restData,
                },
                include: { region: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(`CulturalData with ID "${id}" already exists.`);
                }
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Region with ID "${regionId}" not found.`);
                }
            }
            throw error;
        }
    }

    findAll(): Promise<CulturalData[]> {
        return this.prisma.culturalData.findMany({ include: { region: true } });
    }

    async findOne(id: string): Promise<CulturalData> {
        const culturalData = await this.prisma.culturalData.findUnique({
            where: { id },
            include: { region: true },
        });
        if (!culturalData) {
            throw new NotFoundException(`CulturalData with ID "${id}" not found`);
        }
        return culturalData;
    }

    async update(id: string, updateCulturalDataDto: UpdateCulturalDataDto): Promise<CulturalData> {
        const restData = updateCulturalDataDto;

        try {
            return await this.prisma.culturalData.update({
                where: { id },
                data: restData,
                include: { region: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`CulturalData with ID "${id}" not found for update`);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<CulturalData> {
        try {
            return await this.prisma.culturalData.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`CulturalData with ID "${id}" not found`);
            }
            throw error;
        }
    }
}
