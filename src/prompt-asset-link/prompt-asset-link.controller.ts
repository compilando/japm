import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards, Request } from '@nestjs/common';
import { PromptAssetLinkService } from './prompt-asset-link.service';
import { CreatePromptAssetLinkDto } from './dto/create-prompt-asset-link.dto';
import { UpdatePromptAssetLinkDto } from './dto/update-prompt-asset-link.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { PromptAssetLink, Prompt, PromptAsset } from '@prisma/client';
import { CreatePromptDto } from '../prompt/dto/create-prompt.dto'; // Para respuesta
import { CreatePromptAssetDto } from '../prompt-asset/dto/create-prompt-asset.dto'; // Para respuesta
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';

// DTO de respuesta detallado
class PromptAssetLinkResponse extends CreatePromptAssetLinkDto {
    @ApiProperty({ type: () => CreatePromptDto })
    prompt: Prompt;
    @ApiProperty({ type: () => CreatePromptAssetDto })
    asset: PromptAsset;
    // Incluir el ID del link mismo
    @ApiProperty()
    id: string;
}

@ApiTags('Prompt Asset Links (within Project/Version)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/prompt-versions/:promptVersionId/links')
export class PromptAssetLinkController {
    constructor(private readonly service: PromptAssetLinkService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Link an Asset Version to a Prompt Version within a Project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'promptVersionId', description: 'Prompt Version ID' })
    @ApiBody({ type: CreatePromptAssetLinkDto })
    @ApiResponse({ status: 201, description: 'Link created.', type: CreatePromptAssetLinkDto })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    @ApiResponse({ status: 404, description: 'Project, Prompt Version, or Asset Version not found.' })
    create(
        @Param('projectId') projectId: string,
        @Param('promptVersionId') promptVersionId: string,
        @Body() createDto: CreatePromptAssetLinkDto
    ): Promise<PromptAssetLink> {
        return this.service.create(projectId, promptVersionId, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all links for a specific Prompt Version within a Project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'promptVersionId', description: 'Prompt Version ID' })
    @ApiResponse({ status: 200, description: 'List of links.', type: [CreatePromptAssetLinkDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    @ApiResponse({ status: 404, description: 'Project or Prompt Version not found.' })
    findAll(
        @Param('projectId') projectId: string,
        @Param('promptVersionId') promptVersionId: string
    ): Promise<PromptAssetLink[]> {
        return this.service.findAll(projectId, promptVersionId);
    }

    @Get(':linkId')
    @ApiOperation({ summary: 'Get a specific link by its ID for a Prompt Version within a Project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'promptVersionId', description: 'Prompt Version ID' })
    @ApiParam({ name: 'linkId', description: 'Link ID' })
    @ApiResponse({ status: 200, description: 'Link found.', type: CreatePromptAssetLinkDto })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    @ApiResponse({ status: 404, description: 'Project, Prompt Version, or Link not found.' })
    findOne(
        @Param('projectId') projectId: string,
        @Param('promptVersionId') promptVersionId: string,
        @Param('linkId') linkId: string
    ): Promise<PromptAssetLink> {
        return this.service.findOne(projectId, promptVersionId, linkId);
    }

    @Patch(':linkId')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Update a specific link by its ID for a Prompt Version within a Project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'promptVersionId', description: 'Prompt Version ID' })
    @ApiParam({ name: 'linkId', description: 'Link ID' })
    @ApiBody({ type: UpdatePromptAssetLinkDto })
    @ApiResponse({ status: 200, description: 'Link updated.', type: CreatePromptAssetLinkDto })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    @ApiResponse({ status: 404, description: 'Project, Prompt Version, or Link not found.' })
    update(
        @Param('projectId') projectId: string,
        @Param('promptVersionId') promptVersionId: string,
        @Param('linkId') linkId: string,
        @Body() updateDto: UpdatePromptAssetLinkDto
    ): Promise<PromptAssetLink> {
        return this.service.update(projectId, promptVersionId, linkId, updateDto);
    }

    @Delete(':linkId')
    @ApiOperation({ summary: 'Delete a specific link by its ID for a Prompt Version within a Project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'promptVersionId', description: 'Prompt Version ID' })
    @ApiParam({ name: 'linkId', description: 'Link ID' })
    @ApiResponse({ status: 200, description: 'Link deleted.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    @ApiResponse({ status: 404, description: 'Project, Prompt Version, or Link not found.' })
    remove(
        @Param('projectId') projectId: string,
        @Param('promptVersionId') promptVersionId: string,
        @Param('linkId') linkId: string
    ): Promise<PromptAssetLink> {
        return this.service.remove(projectId, promptVersionId, linkId);
    }
}
