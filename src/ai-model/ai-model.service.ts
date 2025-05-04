import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { AIModel, Prisma } from '@prisma/client';

@Injectable()
export class AiModelService {
    private readonly logger = new Logger(AiModelService.name);
    constructor(private prisma: PrismaService) { }

    async create(projectId: string, createAiModelDto: CreateAiModelDto): Promise<AIModel> {
        this.logger.log(`Attempting to create AIModel for project: ${projectId}`);
        try {
            const newModel = await this.prisma.aIModel.create({
                data: {
                    ...createAiModelDto,
                    projectId: projectId,
                },
            });
            this.logger.log(`Successfully created AIModel ${newModel.id} for project ${projectId}`);
            return newModel;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    this.logger.warn(`Conflict error creating AIModel for project ${projectId}.`);
                    throw new ConflictException(`AIModel creation failed due to a conflict.`);
                }
                if (error.code === 'P2003'){
                     this.logger.warn(`Project ${projectId} not found during AIModel creation.`);
                    throw new NotFoundException(`Project with ID "${projectId}" not found.`);
                }
            }
            this.logger.error(`Error creating AIModel for project ${projectId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findAll(projectId: string): Promise<AIModel[]> {
        this.logger.debug(`Finding all AIModels for project ${projectId} (including global)`);
        return this.prisma.aIModel.findMany({
            where: {
                OR: [
                    { projectId: projectId },
                    { projectId: null }
                ]
            },
            orderBy: {
                name: 'asc'
            }
        });
    }

    async findOne(projectId: string, aiModelId: string): Promise<AIModel> {
         this.logger.debug(`Finding AIModel ${aiModelId} for project ${projectId}`);
         const aiModel = await this.prisma.aIModel.findUnique({
            where: { id: aiModelId },
        });

        if (!aiModel) {
             this.logger.warn(`AIModel ${aiModelId} not found.`);
            throw new NotFoundException(`AIModel with ID "${aiModelId}" not found`);
        }

        if (aiModel.projectId !== null && aiModel.projectId !== projectId) {
             this.logger.warn(`AIModel ${aiModelId} found but does not belong to project ${projectId}.`);
            throw new ForbiddenException(`AIModel with ID "${aiModelId}" does not belong to project "${projectId}"`);
        }
         this.logger.debug(`Found AIModel ${aiModelId} accessible for project ${projectId}`);
        return aiModel;
    }

    async update(projectId: string, aiModelId: string, updateAiModelDto: UpdateAiModelDto): Promise<AIModel> {
        this.logger.log(`Attempting to update AIModel ${aiModelId} for project ${projectId}`);
         const existingModel = await this.prisma.aIModel.findUnique({
            where: { id: aiModelId }
        });

        if (!existingModel) {
            this.logger.warn(`Update failed: AIModel ${aiModelId} not found.`);
            throw new NotFoundException(`AIModel with ID "${aiModelId}" not found`);
        }

        if (existingModel.projectId !== projectId) {
            this.logger.warn(`Update forbidden: AIModel ${aiModelId} does not belong to project ${projectId}.`);
            throw new ForbiddenException(`AIModel with ID "${aiModelId}" does not belong to project "${projectId}" and cannot be updated here.`);
        }

        try {
             const updatedModel = await this.prisma.aIModel.update({
                where: { id: aiModelId },
                data: updateAiModelDto,
            });
             this.logger.log(`Successfully updated AIModel ${aiModelId} for project ${projectId}`);
            return updatedModel;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                     this.logger.warn(`Conflict error updating AIModel ${aiModelId} for project ${projectId}.`);
                    throw new ConflictException(`AIModel update failed due to a conflict.`);
                }
                if (error.code === 'P2025') {
                    // Should not happen due to prior check
                     this.logger.error(`Update failed: AIModel ${aiModelId} not found during update operation.`);
                     throw new NotFoundException(`AIModel with ID "${aiModelId}" not found during update`);
                }
            }
            this.logger.error(`Error updating AIModel ${aiModelId} for project ${projectId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async remove(projectId: string, aiModelId: string): Promise<AIModel> {
         this.logger.log(`Attempting to delete AIModel ${aiModelId} for project ${projectId}`);
         const existingModel = await this.prisma.aIModel.findUnique({
            where: { id: aiModelId }
        });

        if (!existingModel) {
             this.logger.warn(`Delete failed: AIModel ${aiModelId} not found.`);
            throw new NotFoundException(`AIModel with ID "${aiModelId}" not found`);
        }

        if (existingModel.projectId !== projectId) {
             this.logger.warn(`Delete forbidden: AIModel ${aiModelId} does not belong to project ${projectId}.`);
            throw new ForbiddenException(`AIModel with ID "${aiModelId}" does not belong to project "${projectId}" and cannot be deleted here.`);
        }

        try {
             const deletedModel = await this.prisma.aIModel.delete({
                where: { id: aiModelId },
            });
             this.logger.log(`Successfully deleted AIModel ${aiModelId} for project ${projectId}`);
            return deletedModel;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                     // Should not happen due to prior check
                     this.logger.error(`Delete failed: AIModel ${aiModelId} not found during delete operation.`);
                     throw new NotFoundException(`AIModel with ID "${aiModelId}" not found during delete`);
                }
                 if (error.code === 'P2003') {
                     this.logger.warn(`Delete failed: AIModel ${aiModelId} is referenced by other records.`);
                    throw new ConflictException(`Cannot delete AIModel "${aiModelId}" as it is still referenced by other records.`);
                }
            }
            this.logger.error(`Error deleting AIModel ${aiModelId} for project ${projectId}: ${error.message}`, error.stack);
            throw error;
        }
    }
} 