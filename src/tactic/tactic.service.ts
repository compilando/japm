import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTacticDto } from './dto/create-tactic.dto';
import { UpdateTacticDto } from './dto/update-tactic.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Tactic } from '@prisma/client';

@Injectable()
export class TacticService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateTacticDto, projectId: string): Promise<Tactic> {
        const { name, regionId, culturalDataId, tacticsConfig } = createDto;
        const projectExists = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!projectExists) throw new NotFoundException(`Project with ID "${projectId}" not found.`);

        if (regionId) {
            const regionExists = await this.prisma.region.findFirst({ where: { languageCode: regionId, projectId } });
            if (!regionExists) throw new NotFoundException(`Region "${regionId}" not found in project "${projectId}".`);
        }
        if (culturalDataId) {
            const culturalDataExists = await this.prisma.culturalData.findFirst({ where: { id: culturalDataId, projectId } });
            if (!culturalDataExists) throw new NotFoundException(`CulturalData "${culturalDataId}" not found in project "${projectId}".`);
        }

        const existingTactic = await this.prisma.tactic.findFirst({
            where: { name, projectId },
            select: { name: true }
        });
        if (existingTactic) {
            throw new ConflictException(`Tactic with name '${name}' already exists in project '${projectId}'.`);
        }

        try {
            return await this.prisma.tactic.create({
                data: {
                    name,
                    tacticsConfig,
                    projectId: projectId,
                    regionId: regionId,
                    culturalDataId: culturalDataId,
                },
                include: { region: true, culturalData: true, project: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(`Tactic with name "${name}" already exists in project "${projectId}" (potential race condition).`);
                }
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Referenced Region or CulturalData not found.`);
                }
            }
            console.error(`Error creating Tactic "${name}" in project ${projectId}:`, error);
            throw error;
        }
    }

    findAll(projectId: string): Promise<Tactic[]> {
        return this.prisma.tactic.findMany({
            where: { projectId },
            include: { region: true, culturalData: true, _count: { select: { prompts: true } } }
        });
    }

    async findOne(name: string, projectId: string): Promise<Tactic> {
        const tactic = await this.prisma.tactic.findUnique({
            where: { name },
            include: { region: true, culturalData: true, prompts: { select: { name: true, description: true } } }
        });
        if (!tactic || tactic.projectId !== projectId) {
            throw new NotFoundException(`Tactic with name "${name}" not found in project "${projectId}".`);
        }
        return tactic;
    }

    async update(name: string, updateDto: UpdateTacticDto, projectId: string): Promise<Tactic> {
        await this.findOne(name, projectId);
        const { regionId, culturalDataId, tacticsConfig } = updateDto;

        if (regionId !== undefined) {
            if (regionId !== null) {
                const regionExists = await this.prisma.region.findFirst({ where: { languageCode: regionId, projectId } });
                if (!regionExists) throw new NotFoundException(`Region "${regionId}" not found in project "${projectId}".`);
            }
        }
        if (culturalDataId !== undefined) {
            if (culturalDataId !== null) {
                const culturalDataExists = await this.prisma.culturalData.findFirst({ where: { id: culturalDataId, projectId } });
                if (!culturalDataExists) throw new NotFoundException(`CulturalData "${culturalDataId}" not found in project "${projectId}".`);
            }
        }

        const data: Prisma.TacticUpdateInput = {};
        if (tacticsConfig !== undefined) data.tacticsConfig = tacticsConfig;
        if (regionId !== undefined) {
            data.region = regionId ? { connect: { languageCode: regionId } } : { disconnect: true };
        }
        if (culturalDataId !== undefined) {
            data.culturalData = culturalDataId ? { connect: { id: culturalDataId } } : { disconnect: true };
        }

        if (Object.keys(data).length === 0) {
            console.warn(`Update called for Tactic "${name}" in project "${projectId}" with no data to change.`);
            return this.findOne(name, projectId);
        }

        try {
            return await this.prisma.tactic.update({
                where: { name },
                data,
                include: { region: true, culturalData: true, project: true }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Tactic "${name}" or related Region/CulturalData not found during update.`);
            }
            console.error(`Error updating Tactic "${name}" in project ${projectId}:`, error);
            throw error;
        }
    }

    async remove(name: string, projectId: string): Promise<Tactic> {
        const tacticToDelete = await this.findOne(name, projectId);
        console.warn(`Removing tactic "${name}" from project "${projectId}".`);
        try {
            await this.prisma.tactic.delete({
                where: { name },
            });
            return tacticToDelete;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Tactic with name "${name}" not found during deletion.`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(`Cannot delete tactic "${name}" because it is still associated with one or more prompts.`);
                }
            }
            console.error(`Error deleting Tactic "${name}" in project ${projectId}:`, error);
            throw error;
        }
    }
}
