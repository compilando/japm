import {
  Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards, Request
} from '@nestjs/common';
import { PromptAssetVersionService } from './prompt-asset-version.service';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PromptAssetVersion } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';
import { Logger } from '@nestjs/common';

@ApiTags('Prompt Asset Versions (within Project/Asset)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('api/projects/:projectId/assets/:assetKey/versions')
export class PromptAssetVersionController {
  private readonly logger = new Logger(PromptAssetVersionController.name);

  constructor(private readonly service: PromptAssetVersionService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a new version for a specific asset within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiBody({ type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 201, description: 'Version created.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 400, description: 'Invalid data (e.g., duplicate versionTag).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project or Asset not found.' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Body() createDto: CreatePromptAssetVersionDto
  ): Promise<PromptAssetVersion> {
    this.logger.debug(`[create] Received request for projectId: ${projectId}, assetKey: ${assetKey}. Body: ${JSON.stringify(createDto, null, 2)}`);
    return this.service.create(projectId, assetKey, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all versions for a specific asset within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiResponse({ status: 200, description: 'List of versions.', type: [CreatePromptAssetVersionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project or Asset not found.' })
  findAll(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string
  ): Promise<PromptAssetVersion[]> {
    return this.service.findAllForAsset(projectId, assetKey);
  }

  @Get(':versionTag')
  @ApiOperation({ summary: 'Get a specific asset version by its tag within a project/asset' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version tag (e.g., v1.0.0)' })
  @ApiResponse({ status: 200, description: 'Version found.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, or Version not found.' })
  findOneByTag(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string
  ): Promise<PromptAssetVersion> {
    return this.service.findOneByTag(projectId, assetKey, versionTag);
  }

  @Patch(':versionTag')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Update a specific asset version by its tag within a project/asset' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to update' })
  @ApiBody({ type: UpdatePromptAssetVersionDto })
  @ApiResponse({ status: 200, description: 'Version updated.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, or Version not found.' })
  update(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Body() updateDto: UpdatePromptAssetVersionDto
  ): Promise<PromptAssetVersion> {
    this.logger.debug(`[update] Received PATCH for projectId: ${projectId}, assetKey: ${assetKey}, versionTag: ${versionTag}. Body: ${JSON.stringify(updateDto, null, 2)}`);
    return this.service.update(projectId, assetKey, versionTag, updateDto);
  }

  @Delete(':versionTag')
  @ApiOperation({ summary: 'Delete a specific asset version by its tag within a project/asset' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to delete' })
  @ApiResponse({ status: 200, description: 'Version deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, or Version not found.' })
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string
  ): Promise<PromptAssetVersion> {
    return this.service.remove(projectId, assetKey, versionTag);
  }

  // --- Marketplace Endpoints ---

  @Post(':versionTag/request-publish')
  @ApiOperation({ summary: 'Request to publish an asset version to the marketplace' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version tag' })
  @ApiResponse({ status: 200, description: 'Publish request processed.', type: CreatePromptAssetVersionDto }) // Type podría ser DTO completo
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Resource not found.' })
  @HttpCode(HttpStatus.OK)
  requestPublish(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Request() req: any, // Para obtener req.user.userId
  ): Promise<PromptAssetVersion> {
    const requesterId = req.user.userId;
    return this.service.requestPublish(projectId, assetKey, versionTag, requesterId);
  }

  @Post(':versionTag/unpublish')
  @ApiOperation({ summary: 'Unpublish an asset version from the marketplace' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version tag' })
  @ApiResponse({ status: 200, description: 'Version unpublished.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Resource not found.' })
  @HttpCode(HttpStatus.OK)
  unpublish(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Request() req: any, // Para futura lógica de permisos
  ): Promise<PromptAssetVersion> {
    // const userId = req.user.userId; // Para futura lógica de permisos
    return this.service.unpublish(projectId, assetKey, versionTag /*, userId */);
  }
}
