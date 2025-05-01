import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { AIModel } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class AiModelService {
    constructor(private prisma: PrismaService) { }

    async create(createAiModelDto: CreateAiModelDto): Promise<AIModel> {
        try {
            return await this.prisma.aIModel.create({
                data: createAiModelDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Unique constraint violation (e.g., duplicate name)
                if (error.code === 'P2002') {
                    throw new ConflictException(`AIModel with name "${createAiModelDto.name}" already exists`);
                }
            }
            throw error;
        }
    }

    async findAll(): Promise<AIModel[]> {
        return this.prisma.aIModel.findMany();
    }

    async findOne(id: string): Promise<AIModel> {
        const aiModel = await this.prisma.aIModel.findUnique({
            where: { id },
        });
        if (!aiModel) {
            throw new NotFoundException(`AIModel with ID "${id}" not found`);
        }
        return aiModel;
    }

    async update(id: string, updateAiModelDto: UpdateAiModelDto): Promise<AIModel> {
        try {
            return await this.prisma.aIModel.update({
                where: { id },
                data: updateAiModelDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Record to update not found
                if (error.code === 'P2025') {
                    throw new NotFoundException(`AIModel with ID "${id}" not found`);
                }
                // Unique constraint violation (e.g., trying to update name to an existing one)
                if (error.code === 'P2002') {
                    // Need to check which field caused the error, assuming name for now
                    throw new ConflictException(`AIModel with name "${updateAiModelDto.name}" already exists`);
                }
            }
            throw error;
        }
    }

    async remove(id: string): Promise<AIModel> {
        try {
            return await this.prisma.aIModel.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Record to delete not found
                if (error.code === 'P2025') {
                    throw new NotFoundException(`AIModel with ID "${id}" not found`);
                }
            }
            throw error;
        }
    }
} 