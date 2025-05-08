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
        this.logger.log(`Attempting to create AIModel "${createAiModelDto.name}" for project: ${projectId}`);
        try {
            const newModel = await this.prisma.aIModel.create({
                data: {
                    ...createAiModelDto,
                    projectId: projectId,
                },
            });
            this.logger.log(`Successfully created AIModel ${newModel.id} ("${newModel.name}") for project ${projectId}`);
            return newModel;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    this.logger.warn(`Conflict error creating AIModel "${createAiModelDto.name}" for project ${projectId}. It likely already exists.`);
                    throw new ConflictException(`AIModel with name "${createAiModelDto.name}" already exists in project "${projectId}".`);
                }
                if (error.code === 'P2003') {
                    this.logger.warn(`Project ${projectId} not found during AIModel creation (Foreign Key Constraint).`);
                    throw new NotFoundException(`Project with ID "${projectId}" not found.`);
                }
            }
            this.logger.error(`Error creating AIModel for project ${projectId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findAll(projectId: string): Promise<AIModel[]> {
        this.logger.debug(`Finding all AIModels for project ${projectId}`);
        return this.prisma.aIModel.findMany({
            where: {
                projectId: projectId,
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

        if (aiModel.projectId !== projectId) {
            this.logger.warn(`Access forbidden: AIModel ${aiModelId} found but belongs to project ${aiModel.projectId}, not requested project ${projectId}.`);
            throw new ForbiddenException(`AIModel with ID "${aiModelId}" does not belong to project "${projectId}"`);
        }
        this.logger.debug(`Found AIModel ${aiModelId} belonging to project ${projectId}`);
        return aiModel;
    }

    async update(projectId: string, aiModelId: string, updateAiModelDto: UpdateAiModelDto): Promise<AIModel> {
        this.logger.log(`Attempting to update AIModel ${aiModelId} for project ${projectId}`);
        await this.findOne(projectId, aiModelId);

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
                    this.logger.warn(`Conflict error updating AIModel ${aiModelId} for project ${projectId}. Name conflict?`);
                    throw new ConflictException(`Update failed: An AIModel with the new name might already exist in project "${projectId}".`);
                }
                if (error.code === 'P2025') {
                    this.logger.error(`Update failed: AIModel ${aiModelId} not found during update operation (should have been caught earlier).`);
                    throw new NotFoundException(`AIModel with ID "${aiModelId}" could not be updated as it was not found.`);
                }
            }
            this.logger.error(`Error updating AIModel ${aiModelId} for project ${projectId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async remove(projectId: string, aiModelId: string): Promise<AIModel> {
        this.logger.log(`Attempting to delete AIModel ${aiModelId} for project ${projectId}`);
        await this.findOne(projectId, aiModelId);

        try {
            const deletedModel = await this.prisma.aIModel.delete({
                where: { id: aiModelId },
            });
            this.logger.log(`Successfully deleted AIModel ${aiModelId} for project ${projectId}`);
            return deletedModel;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    this.logger.error(`Delete failed: AIModel ${aiModelId} not found during delete operation (should have been caught earlier).`);
                    throw new NotFoundException(`AIModel with ID "${aiModelId}" could not be deleted as it was not found.`);
                }
                if (error.code === 'P2003') {
                    this.logger.warn(`Delete failed: AIModel ${aiModelId} is referenced by other records (e.g., PromptVersions).`);
                    throw new ConflictException(`Cannot delete AIModel "${aiModelId}" as it is still referenced by other records.`);
                }
            }
            this.logger.error(`Error deleting AIModel ${aiModelId} for project ${projectId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    getProviderTypes(): string[] {
        this.logger.debug('Fetching available Langchain provider types');
        return [
            'OpenAI',
            'Anthropic',
            'Azure OpenAI',
            'Google Vertex AI',
            'Google GenAI',
            'Cohere',
            'HuggingFace Inference',
            'Ollama',
            'MistralAI',
            'AWS Bedrock',
            'Fireworks AI',
            'Together AI',
            'AI21',
            'AlephAlpha',
            // Consider adding more or making this configurable if needed
        ];
    }
} 