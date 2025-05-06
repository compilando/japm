import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, NotFoundException, HttpCode, HttpStatus, Put, Query, Req, UseGuards, Inject, Logger } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
// import { TestPromptDto } from './dto/test-prompt.dto'; // No longer used
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Prompt, PromptVersion, PromptTranslation } from '@prisma/client'; // Import only necessary types
import { ProjectGuard } from '../common/guards/project.guard'; // Import guard
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import JwtAuthGuard
import { Request as ExpressRequest } from 'express';
import { Response } from 'express';

// Definir interfaz para el request con projectId
interface RequestWithProject extends ExpressRequest {
    projectId: string;
}

// Clases DTO de parámetros eliminadas completamente

@ApiTags('Prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard) // Apply JwtAuthGuard BEFORE ProjectGuard
@Controller('/api/projects/:projectId/prompts') // New base path
export class PromptController {
    private readonly logger = new Logger(PromptController.name); // Add Logger

    constructor(private readonly service: PromptService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Creates a new logical prompt within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiBody({ type: CreatePromptDto })
    @ApiResponse({ status: 201, description: 'Prompt created.', type: CreatePromptDto }) // Adjust response type if needed
    @ApiResponse({ status: 400, description: 'Invalid data (e.g., missing initial promptText).' })
    @ApiResponse({ status: 404, description: 'Project, Tactic or Tag not found.' })
    @ApiResponse({ status: 409, description: 'Conflict, a prompt with this name already exists in the project.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: RequestWithProject, @Body() createDto: CreatePromptDto): Promise<Prompt> { // Return type could be more specific
        const projectId = req.projectId;
        return this.service.create(createDto, projectId);
    }

    @Get()
    @ApiOperation({ summary: 'Gets all logical prompts for a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiResponse({ status: 200, description: 'List of prompts.', type: [CreatePromptDto] }) // Adjust type
    @ApiResponse({ status: 404, description: 'Project not found.' })
    findAll(@Req() req: RequestWithProject): Promise<Prompt[]> {
        const projectId = req.projectId;
        return this.service.findAll(projectId);
    }

    // Use :promptName as identifier within the project
    @Get(':promptName')
    @ApiOperation({ summary: 'Gets a logical prompt by its name within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'promptName', description: 'Unique name of the prompt within the project' })
    @ApiResponse({ status: 200, description: 'Prompt found.', type: CreatePromptDto }) // Adjust type
    @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
    findOne(@Req() req: RequestWithProject, @Param('promptName') promptName: string): Promise<Prompt> { // Return type could be more specific
        const projectId = req.projectId;
        return this.service.findOneByName(promptName, projectId);
    }

    @Patch(':promptName')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Updates an existing prompt by its name for a specific project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'promptName', description: 'Name of the prompt to update', type: String })
    @ApiBody({ type: UpdatePromptDto, description: 'Data to update the prompt' })
    @ApiResponse({ status: 200, description: 'Prompt updated successfully.' })
    @ApiResponse({ status: 404, description: 'Project, Prompt, or Tag not found.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    async update(
        @Req() req: RequestWithProject,
        @Param('promptName') promptName: string,
        @Body() updateDto: UpdatePromptDto
    ): Promise<Prompt> { // Correct return type
        this.logger.log(
            `[update] Received PATCH for projectId: ${req.projectId}, promptName: ${promptName}`,
        );
        const projectId = req.projectId;
        const promptToUpdate = await this.service.findOneByName(promptName, projectId);
        return this.service.update(promptToUpdate.id, updateDto, projectId);
    }

    @Delete(':promptName')
    @ApiOperation({ summary: 'Deletes a logical prompt (and its associated versions via Cascade) within a project by name' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'promptName', description: 'Name of the prompt to delete', type: String })
    @ApiResponse({ status: 200, description: 'Prompt deleted.' })
    @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
    @ApiResponse({ status: 409, description: 'Conflict on deletion (check non-cascading relations).' })
    @HttpCode(HttpStatus.OK)
    async remove(@Req() req: RequestWithProject, @Param('promptName') promptName: string): Promise<Prompt> { // Añadir async
        const projectId = req.projectId;
        const promptToDelete = await this.service.findOneByName(promptName, projectId);
        return this.service.remove(promptToDelete.id, projectId);
    }

    // --- Version Endpoints --- //

    @Post(':promptId/versions')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Creates a new version for an existing prompt in the project (using prompt ID).' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'promptId', description: 'Parent prompt ID (CUID)' })
    @ApiBody({ type: CreatePromptVersionDto })
    @ApiResponse({ status: 201, description: 'New version created.' /* , type: PromptVersionDto */ })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 404, description: 'Project, Parent Prompt, AssetVersion or Environment not found.' })
    @ApiResponse({ status: 409, description: 'Conflict (e.g., versionTag already exists for this prompt).' })
    createVersion(
        @Req() req: RequestWithProject,
        @Param('promptId') promptId: string,
        @Body() createVersionDto: CreatePromptVersionDto
    ): Promise<PromptVersion> {
        const projectId = req.projectId;
        return this.service.createVersion(promptId, createVersionDto, projectId);
    }

    // --- Translation Endpoints --- //

    @Put(':promptName/versions/:versionId/translations')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Adds or updates a translation for a specific prompt version in the project.' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'promptName', description: 'Parent prompt name (contextual)', type: String })
    @ApiParam({ name: 'versionId', description: 'ID of the version to translate (CUID)', type: String })
    @ApiBody({ type: CreateOrUpdatePromptTranslationDto })
    @ApiResponse({ status: 200, description: 'Translation created or updated.' /* , type: PromptTranslationDto */ })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 404, description: 'Project or Version not found.' })
    addOrUpdateTranslation(
        @Req() req: RequestWithProject,
        @Param('versionId') versionId: string,
        @Body() translationDto: CreateOrUpdatePromptTranslationDto
    ): Promise<PromptTranslation> {
        const projectId = req.projectId;
        return this.service.addOrUpdateTranslation(versionId, translationDto, projectId);
    }
}
