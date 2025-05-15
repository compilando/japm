import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { AiModelService } from './ai-model.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AIModel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming you have JWT auth
import { ProjectGuard } from '../common/guards/project.guard'; // Assuming you have this guard
import { AiModelResponseDto } from './dto/ai-model-response.dto';
import { Logger } from '@nestjs/common'; // Import Logger

@ApiTags('AI Models (Project Specific)')
@ApiBearerAuth() // Add if endpoints require authentication
@UseGuards(JwtAuthGuard, ProjectGuard) // Apply guards globally to this controller
@Controller('projects/:projectId/aimodels') // Changed base route
export class AiModelController {
  private readonly logger = new Logger(AiModelController.name); // Add Logger instance

  constructor(private readonly aiModelService: AiModelService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new AI model for this project' })
  @ApiResponse({
    status: 201,
    description: 'The AI model has been successfully created.',
    type: AiModelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict. AIModel with this name already exists.',
  })
  create(
    @Param('projectId') projectId: string,
    @Body() createAiModelDto: CreateAiModelDto,
  ): Promise<AIModel> {
    this.logger.debug(
      `[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createAiModelDto, null, 2)}`,
    ); // Log the received DTO
    return this.aiModelService.create(projectId, createAiModelDto);
  }

  @Get()
  @UseInterceptors(CacheInterceptor) // Consider cache key including projectId
  @ApiOperation({
    summary: 'Get all AI models for this project (includes global models)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of project-specific and global AI models.',
    type: [AiModelResponseDto],
  })
  findAll(@Param('projectId') projectId: string): Promise<AIModel[]> {
    return this.aiModelService.findAll(projectId);
  }

  @Get(':aiModelId') // Changed param name for clarity
  @ApiOperation({
    summary:
      'Get a specific AI model by ID (must belong to project or be global)',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'aiModelId', description: 'AI Model CUID' })
  @ApiResponse({
    status: 200,
    description: 'The found AI model record',
    type: AiModelResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'AI Model not found or not accessible for this project.',
  })
  findOne(
    @Param('projectId') projectId: string,
    @Param('aiModelId') aiModelId: string,
  ): Promise<AIModel> {
    return this.aiModelService.findOne(projectId, aiModelId);
  }

  @Patch(':aiModelId') // Changed param name
  @ApiOperation({
    summary: 'Update an AI model by ID (must belong to project)',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'aiModelId', description: 'AI Model CUID' })
  @ApiResponse({
    status: 200,
    description: 'The AI model has been successfully updated.',
    type: AiModelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'AI Model not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict. AIModel with this name already exists.',
  })
  update(
    @Param('projectId') projectId: string,
    @Param('aiModelId') aiModelId: string,
    @Body() updateAiModelDto: UpdateAiModelDto,
  ): Promise<AIModel> {
    this.logger.debug(
      `[update] Received PATCH for projectId: ${projectId}, aiModelId: ${aiModelId}. Body: ${JSON.stringify(updateAiModelDto, null, 2)}`,
    ); // Log the received DTO
    return this.aiModelService.update(projectId, aiModelId, updateAiModelDto);
  }

  @Delete(':aiModelId') // Changed param name
  @ApiOperation({
    summary: 'Delete an AI model by ID (must belong to project)',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'aiModelId', description: 'AI Model CUID' })
  @ApiResponse({
    status: 200,
    description: 'The AI model has been successfully deleted.',
    type: AiModelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'AI Model not found.' })
  remove(
    @Param('projectId') projectId: string,
    @Param('aiModelId') aiModelId: string,
  ): Promise<AIModel> {
    return this.aiModelService.remove(projectId, aiModelId);
  }

  @Get('providers/types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List available Langchain provider types' })
  @ApiParam({
    name: 'projectId',
    description:
      'The ID of the project (used for context/authorization, though the list is global)',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'A list of Langchain provider types.',
    type: [String],
  })
  getProviderTypes(): string[] {
    this.logger.debug(
      '[getProviderTypes] Received request for Langchain provider types',
    );
    return this.aiModelService.getProviderTypes();
  }
}
