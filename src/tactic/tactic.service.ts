import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTacticDto } from './dto/create-tactic.dto';
import { UpdateTacticDto } from './dto/update-tactic.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Tactic } from '@prisma/client';

@Injectable()
export class TacticService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateTacticDto): Promise<Tactic> {
        const { name, regionId, culturalDataId, tacticsConfig, projectId } = createDto;
        if (regionId) {
            const regionExists = await this.prisma.region.findUnique({ where: { languageCode: regionId } });
            if (!regionExists) throw new NotFoundException(`Region with languageCode "${regionId}" not found.`);
        }
        if (culturalDataId) {
            const culturalDataExists = await this.prisma.culturalData.findUnique({ where: { id: culturalDataId } });
            if (!culturalDataExists) throw new NotFoundException(`CulturalData with ID "${culturalDataId}" not found.`);
        }
        if (projectId) {
            const projectExists = await this.prisma.project.findUnique({ where: { id: projectId } });
            if (!projectExists) throw new NotFoundException(`Project with ID "${projectId}" not found.`);
        }

        try {
            return await this.prisma.tactic.create({
                data: {
                    name,
                    tacticsConfig,
                    region: regionId ? { connect: { languageCode: regionId } } : undefined,
                    culturalData: culturalDataId ? { connect: { id: culturalDataId } } : undefined,
                    project: projectId ? { connect: { id: projectId } } : undefined,
                },
                include: { region: true, culturalData: true, project: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Tactic with name "${name}" already exists.`);
            }
            throw error;
        }
    }

    findAll(): Promise<Tactic[]> {
        return this.prisma.tactic.findMany({
            include: { region: true, culturalData: true, project: true, _count: { select: { prompts: true } } }
        });
    }

    async findOne(name: string): Promise<Tactic> {
        const tactic = await this.prisma.tactic.findUnique({
            where: { name },
            include: { region: true, culturalData: true, project: true, prompts: { select: { name: true, description: true } } }
        });
        if (!tactic) {
            throw new NotFoundException(`Tactic with name "${name}" not found.`);
        }
        return tactic;
    }

    async update(name: string, updateDto: UpdateTacticDto): Promise<Tactic> {
        const { regionId, culturalDataId, tacticsConfig, projectId } = updateDto;
        if (regionId !== undefined) {
            if (regionId === null) {
                //OK
            } else {
                const regionExists = await this.prisma.region.findUnique({ where: { languageCode: regionId } });
                if (!regionExists) throw new NotFoundException(`Region with languageCode "${regionId}" not found.`);
            }
        }
        if (culturalDataId !== undefined) {
            if (culturalDataId === null) {
                //OK
            } else {
                const culturalDataExists = await this.prisma.culturalData.findUnique({ where: { id: culturalDataId } });
                if (!culturalDataExists) throw new NotFoundException(`CulturalData with ID "${culturalDataId}" not found.`);
            }
        }
        if (projectId !== undefined) {
            if (projectId === null) {
                //OK
            } else {
                const projectExists = await this.prisma.project.findUnique({ where: { id: projectId } });
                if (!projectExists) throw new NotFoundException(`Project with ID "${projectId}" not found.`);
            }
        }

        const data: Prisma.TacticUpdateInput = {};
        if (tacticsConfig !== undefined) data.tacticsConfig = tacticsConfig;
        if (regionId !== undefined) data.region = regionId === null ? { disconnect: true } : { connect: { languageCode: regionId } };
        if (culturalDataId !== undefined) data.culturalData = culturalDataId === null ? { disconnect: true } : { connect: { id: culturalDataId } };
        if (projectId !== undefined) data.project = projectId === null ? { disconnect: true } : { connect: { id: projectId } };

        try {
            return await this.prisma.tactic.update({
                where: { name },
                data,
                include: { region: true, culturalData: true, project: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Tactic with name "${name}" not found, or related entity missing.`);
            }
            throw error;
        }
    }

    async remove(name: string): Promise<Tactic> {
        console.warn(`Removing tactic "${name}". Ensure associated prompts are handled if necessary.`);
        try {
            return await this.prisma.tactic.delete({
                where: { name },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Tactic with name "${name}" not found.`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(`Cannot delete tactic "${name}" because it is still associated with one or more prompts.`);
                }
            }
            throw error;
        }
    }
}
