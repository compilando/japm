import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { AIModel, Prisma } from '@prisma/client';

// Reverting to original global implementation
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
                if (error.code === 'P2002') {
                    // Assuming name is the unique field causing conflict
                    throw new ConflictException(`AIModel with name "${createAiModelDto.name}" already exists`);
                }
            }
            console.error('Error creating AIModel:', error);
            throw error;
        }
    }

    async findAll(): Promise<AIModel[]> {
        // Find all global AI Models
        return this.prisma.aIModel.findMany();
    }

    async findOne(id: string): Promise<AIModel> {
        // Find by global ID
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
            // Update by global ID
            return await this.prisma.aIModel.update({
                where: { id },
                data: updateAiModelDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`AIModel with ID "${id}" not found`);
                }
                if (error.code === 'P2002') {
                    // Assuming potential conflict on updated name
                    throw new ConflictException(`AIModel with name "${updateAiModelDto.name}" already exists`);
                }
            }
            console.error(`Error updating AIModel ${id}:`, error);
            throw error;
        }
    }

    async remove(id: string): Promise<AIModel> {
        try {
            // Delete by global ID
            return await this.prisma.aIModel.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`AIModel with ID "${id}" not found`);
                }
                // P2003 Foreign Key violation if other models reference it (not expected now)
                if (error.code === 'P2003') {
                    throw new ConflictException(`Cannot delete AIModel "${id}" as it is still referenced.`);
                }
            }
            console.error(`Error deleting AIModel ${id}:`, error);
            throw error;
        }
    }
} 