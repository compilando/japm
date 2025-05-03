import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { AiModelService } from './ai-model.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AIModel } from '@prisma/client';

@ApiTags('AI Models')
@Controller('api/ai-models') // Route prefix
export class AiModelController {
    constructor(private readonly aiModelService: AiModelService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new AI model' })
    @ApiResponse({ status: 201, description: 'The AI model has been successfully created.', type: CreateAiModelDto })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 409, description: 'Conflict. AIModel with this name already exists.' })
    create(@Body() createAiModelDto: CreateAiModelDto): Promise<AIModel> {
        return this.aiModelService.create(createAiModelDto);
    }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Get all AI models' })
    @ApiResponse({ status: 200, description: 'List of all AI models.', type: [CreateAiModelDto] })
    findAll(): Promise<AIModel[]> {
        return this.aiModelService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get an AI model by ID' })
    @ApiParam({ name: 'id', description: 'AI Model CUID', type: String })
    @ApiResponse({ status: 200, description: 'The found AI model record', type: CreateAiModelDto })
    @ApiResponse({ status: 404, description: 'AI Model not found.' })
    findOne(@Param('id') id: string): Promise<AIModel> {
        return this.aiModelService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an AI model by ID' })
    @ApiParam({ name: 'id', description: 'AI Model CUID', type: String })
    @ApiResponse({ status: 200, description: 'The AI model has been successfully updated.', type: CreateAiModelDto })
    @ApiResponse({ status: 404, description: 'AI Model not found.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 409, description: 'Conflict. AIModel with this name already exists.' })
    update(@Param('id') id: string, @Body() updateAiModelDto: UpdateAiModelDto): Promise<AIModel> {
        return this.aiModelService.update(id, updateAiModelDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an AI model by ID' })
    @ApiParam({ name: 'id', description: 'AI Model CUID', type: String })
    @ApiResponse({ status: 200, description: 'The AI model has been successfully deleted.', type: CreateAiModelDto })
    @ApiResponse({ status: 404, description: 'AI Model not found.' })
    remove(@Param('id') id: string): Promise<AIModel> {
        return this.aiModelService.remove(id);
    }
}
