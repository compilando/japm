import {
  Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards, Request, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PromptVersionService } from './prompt-version.service';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PromptVersion } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';
import { CreatePromptVersionDto } from 'src/prompt/dto/create-prompt-version.dto';

@ApiTags('Prompt Versions (within Project/Prompt)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('api/projects/:projectId/prompts/:promptId/versions')
export class PromptVersionController {
  constructor(private readonly service: PromptVersionService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a new version for a specific prompt within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiBody({ type: CreatePromptVersionDto })
  @ApiResponse({ status: 201, description: 'Version created.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 400, description: 'Invalid data (e.g., duplicate versionTag).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
  create(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Body() createDto: CreatePromptVersionDto
  ): Promise<PromptVersion> {
    return this.service.create(projectId, promptId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all versions for a specific prompt within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiResponse({ status: 200, description: 'List of versions.', type: [CreatePromptVersionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
  findAll(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string
  ): Promise<PromptVersion[]> {
    return this.service.findAllForPrompt(projectId, promptId);
  }

  @Get(':versionTag')
  @ApiOperation({ summary: 'Get a specific prompt version by its tag within a project/prompt' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({ name: 'versionTag', description: 'Version tag (e.g., v1.0.0)' })
  @ApiResponse({ status: 200, description: 'Version found.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Prompt, or Version not found.' })
  findOneByTag(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string
  ): Promise<PromptVersion> {
    return this.service.findOneByTag(projectId, promptId, versionTag);
  }

  @Patch(':versionTag')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Update a specific prompt version by its tag within a project/prompt' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to update' })
  @ApiBody({ type: UpdatePromptVersionDto })
  @ApiResponse({ status: 200, description: 'Version updated.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Prompt, or Version not found.' })
  update(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string,
    @Body() updateDto: UpdatePromptVersionDto
  ): Promise<PromptVersion> {
    return this.service.update(projectId, promptId, versionTag, updateDto);
  }

  @Delete(':versionTag')
  @ApiOperation({ summary: 'Delete a specific prompt version by its tag within a project/prompt' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to delete' })
  @ApiResponse({ status: 200, description: 'Version deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Prompt, or Version not found.' })
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string
  ): Promise<PromptVersion> {
    return this.service.remove(projectId, promptId, versionTag);
  }

  // --- Marketplace Endpoints ---

  @Post(':versionTag/request-publish')
  @ApiOperation({ summary: 'Request to publish a prompt version to the marketplace' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID (slug)' })
  @ApiParam({ name: 'versionTag', description: 'Version tag' })
  @ApiResponse({ status: 200, description: 'Publish request processed.', type: CreatePromptVersionDto }) // Type podría ser PromptVersion DTO completo
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Resource not found.' })
  @HttpCode(HttpStatus.OK)
  requestPublish(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string, // Usando promptId consistentemente con el resto del controlador
    @Param('versionTag') versionTag: string,
    @Request() req: any, // Para obtener req.user.userId
  ): Promise<PromptVersion> {
    const requesterId = req.user.userId;
    return this.service.requestPublish(projectId, promptId, versionTag, requesterId);
  }

  @Post(':versionTag/unpublish')
  @ApiOperation({ summary: 'Unpublish a prompt version from the marketplace' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID (slug)' })
  @ApiParam({ name: 'versionTag', description: 'Version tag' })
  @ApiResponse({ status: 200, description: 'Version unpublished.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Resource not found.' })
  @HttpCode(HttpStatus.OK)
  unpublish(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string, // Usando promptId consistentemente
    @Param('versionTag') versionTag: string,
    @Request() req: any, // Aunque userId no se usa en el servicio todavía, es bueno tenerlo para permisos futuros
  ): Promise<PromptVersion> {
    // const userId = req.user.userId; // Para futura lógica de permisos
    return this.service.unpublish(projectId, promptId, versionTag /*, userId */);
  }
}
