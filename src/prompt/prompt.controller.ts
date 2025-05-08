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
    @ApiOperation({ summary: 'Creates a new logical prompt (with ID as slug) within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiBody({ type: CreatePromptDto })
    @ApiResponse({ status: 201, description: 'Prompt created.', type: CreatePromptDto })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 404, description: 'Project or Tag not found.' })
    @ApiResponse({ status: 409, description: 'Conflict, the generated slug for this prompt name already exists globally.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: RequestWithProject, @Body() createDto: CreatePromptDto): Promise<Prompt> {
        const projectId = req.projectId;
        this.logger.debug(`[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createDto, null, 2)}`);
        return this.service.create(createDto, projectId);
    }

    @Get()
    @ApiOperation({ summary: 'Gets all logical prompts for a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiResponse({ status: 200, description: 'List of prompts.', type: [CreatePromptDto] })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    findAll(@Req() req: RequestWithProject): Promise<Prompt[]> {
        const projectId = req.projectId;
        return this.service.findAll(projectId);
    }

    @Get(':promptId')
    @ApiOperation({ summary: 'Gets a logical prompt by its ID (slug) within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiParam({ name: 'promptId', description: 'ID (slug) of the prompt' })
    @ApiResponse({ status: 200, description: 'Prompt found.', type: CreatePromptDto })
    @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
    findOne(
        @Req() req: RequestWithProject,
        @Param('promptId') promptIdSlug: string
    ): Promise<Prompt> {
        const projectId = req.projectId;
        return this.service.findOne(promptIdSlug, projectId);
    }

    @Patch(':promptId')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Updates an existing prompt by its ID (slug) for a specific project' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiParam({ name: 'promptId', description: 'ID (slug) of the prompt to update', type: String })
    @ApiBody({ type: UpdatePromptDto, description: 'Data to update the prompt' })
    @ApiResponse({ status: 200, description: 'Prompt updated successfully.' })
    @ApiResponse({ status: 404, description: 'Project, Prompt, or Tag not found.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    update(
        @Req() req: RequestWithProject,
        @Param('promptId') promptIdSlug: string,
        @Body() updateDto: UpdatePromptDto
    ): Promise<Prompt> {
        const projectId = req.projectId;
        this.logger.debug(`[update] Received PATCH for projectId: ${projectId}, promptId: ${promptIdSlug}. Body: ${JSON.stringify(updateDto, null, 2)}`);
        return this.service.update(promptIdSlug, updateDto, projectId);
    }

    @Delete(':promptId')
    @ApiOperation({ summary: 'Deletes a logical prompt (and its associated versions via Cascade) within a project by ID (slug)' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiParam({ name: 'promptId', description: 'ID (slug) of the prompt to delete', type: String })
    @ApiResponse({ status: 200, description: 'Prompt deleted.' })
    @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
    @ApiResponse({ status: 409, description: 'Conflict on deletion (check non-cascading relations).' })
    @HttpCode(HttpStatus.OK)
    remove(
        @Req() req: RequestWithProject,
        @Param('promptId') promptIdSlug: string
    ): Promise<Prompt> {
        const projectId = req.projectId;
        return this.service.remove(promptIdSlug, projectId);
    }

    // --- Version Endpoints --- //

    @Post(':promptId/versions')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Creates a new version for an existing prompt in the project (using prompt ID slug).' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiParam({ name: 'promptId', description: 'Parent prompt ID (slug)' })
    @ApiBody({ type: CreatePromptVersionDto })
    @ApiResponse({ status: 201, description: 'New version created.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 404, description: 'Project or Parent Prompt not found.' })
    @ApiResponse({ status: 409, description: 'Conflict (e.g., calculated versionTag already exists).' })
    createVersion(
        @Req() req: RequestWithProject,
        @Param('promptId') promptIdSlug: string,
        @Body() createVersionDto: CreatePromptVersionDto
    ): Promise<PromptVersion> {
        const projectId = req.projectId;
        this.logger.debug(`[createVersion] Received request for projectId: ${projectId}, promptId: ${promptIdSlug}. Body: ${JSON.stringify(createVersionDto, null, 2)}`);
        return this.service.createVersion(promptIdSlug, createVersionDto, projectId);
    }

    // --- Translation Endpoints --- //

    @Put('versions/:versionIdCuid/translations')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Adds or updates a translation for a specific prompt version (identified by CUID) in the project.' })
    @ApiParam({ name: 'projectId', description: 'Project ID (slug)', type: String })
    @ApiParam({ name: 'versionIdCuid', description: 'ID of the version to translate (CUID)', type: String })
    @ApiBody({ type: CreateOrUpdatePromptTranslationDto })
    @ApiResponse({ status: 200, description: 'Translation created or updated.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 403, description: 'Forbidden (Version not in Project).' })
    @ApiResponse({ status: 404, description: 'Project or Version not found.' })
    addOrUpdateTranslation(
        @Req() req: RequestWithProject,
        @Param('versionIdCuid') versionIdCuid: string,
        @Body() translationDto: CreateOrUpdatePromptTranslationDto
    ): Promise<PromptTranslation> {
        const projectId = req.projectId;
        this.logger.debug(`[addOrUpdateTranslation] Received request for projectId: ${projectId}, versionId: ${versionIdCuid}. Body: ${JSON.stringify(translationDto, null, 2)}`);
        return this.service.addOrUpdateTranslation(versionIdCuid, translationDto, projectId);
    }
}
