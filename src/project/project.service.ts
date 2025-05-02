import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectService {
    constructor(private prisma: PrismaService) { }

    async create(createProjectDto: CreateProjectDto): Promise<Project> {
        const { ownerUserId, ...projectData } = createProjectDto;
        return this.prisma.project.create({
            data: {
                ...projectData,
                ...(ownerUserId && { owner: { connect: { id: ownerUserId } } }),
            },
        });
    }

    async findAll(): Promise<Project[]> {
        return this.prisma.project.findMany();
    }

    async findAllForUser(userId: string): Promise<Pick<Project, 'id' | 'name'>[]> {
        return this.prisma.project.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    async findOne(id: string): Promise<Project> {
        const project = await this.prisma.project.findUnique({
            where: { id },
        });
        if (!project) {
            throw new NotFoundException(`Project with ID "${id}" not found`);
        }
        return project;
    }

    async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
        const { ownerUserId, ...projectData } = updateProjectDto;
        try {
            return await this.prisma.project.update({
                where: { id },
                data: {
                    ...projectData,
                    ...(ownerUserId && { owner: { connect: { id: ownerUserId } } }),
                    // Si se permite desconectar owner, añadir: ...(ownerUserId === null && { owner: { disconnect: true } })
                },
            });
        } catch (error) {
            // Podría ser PrismaClientKnownRequestError P2025 si el project no existe
            if (error.code === 'P2025') {
                throw new NotFoundException(`Project with ID "${id}" not found`);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<Project> {
        try {
            return await this.prisma.project.delete({
                where: { id },
            });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException(`Project with ID "${id}" not found`);
            }
            throw error;
        }
    }
} 