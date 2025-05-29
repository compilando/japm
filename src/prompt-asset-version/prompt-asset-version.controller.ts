import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  SetMetadata,
  Query,
} from '@nestjs/common';
import { PromptAssetVersionService } from './prompt-asset-version.service';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromptAssetVersion, User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ProjectGuard,
  PROJECT_ID_PARAM_KEY,
} from '../common/guards/project.guard';
import { Logger } from '@nestjs/common';

interface RequestWithUser extends Request {
  user: User & {
    userId: string;
    tenantId: string;
  };
}

@ApiTags('PromptAssetVersions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
@Controller('projects/:projectId/prompts/:promptId/assets/:assetKey/versions')
export class PromptAssetVersionController {
  private readonly logger = new Logger(PromptAssetVersionController.name);

  constructor(private readonly service: PromptAssetVersionService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a new version for a specific prompt asset' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiBody({ type: CreatePromptAssetVersionDto })
  @ApiResponse({
    status: 201,
    description: 'Version created.',
    type: CreatePromptAssetVersionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data (e.g., duplicate versionTag).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project or Asset not found.' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Body() createDto: CreatePromptAssetVersionDto,
  ): Promise<PromptAssetVersion> {
    this.logger.debug(
      `[create] Received request for projectId: ${projectId}, promptId: ${promptId}, assetKey: ${assetKey}. Body: ${JSON.stringify(createDto, null, 2)}`,
    );
    return this.service.create(projectId, promptId, assetKey, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all versions for a specific prompt asset' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiResponse({
    status: 200,
    description: 'List of versions.',
    type: [CreatePromptAssetVersionDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project or Asset not found.' })
  findAll(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Query('languageCode') languageCode?: string,
  ): Promise<PromptAssetVersion[]> {
    return this.service.findAllForAsset(
      projectId,
      promptId,
      assetKey,
      languageCode,
    );
  }

  @Get(':versionTag')
  @ApiOperation({ summary: 'Get a specific prompt asset version by its tag' })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({ name: 'versionTag', description: 'Version tag (e.g., 1.0.0)' })
  @ApiResponse({
    status: 200,
    description: 'Version found.',
    type: CreatePromptAssetVersionDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  findOneByTag(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Query('languageCode') languageCode?: string,
  ): Promise<PromptAssetVersion> {
    return this.service.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
      languageCode,
    );
  }

  @Patch(':versionTag')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({
    summary: 'Update a specific prompt asset version by its tag',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to update' })
  @ApiBody({ type: UpdatePromptAssetVersionDto })
  @ApiResponse({
    status: 200,
    description: 'Version updated.',
    type: CreatePromptAssetVersionDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Body() updateDto: UpdatePromptAssetVersionDto,
    @Request() req: RequestWithUser,
  ): Promise<PromptAssetVersion> {
    this.logger.debug(
      `[update] Received PATCH for projectId: ${projectId}, promptId: ${promptId}, assetKey: ${assetKey}, versionTag: ${versionTag}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    );
    const version = await this.service.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
    return this.service.update(
      version.id,
      projectId,
      req.user.userId,
      updateDto,
    );
  }

  @Delete(':versionTag')
  @ApiOperation({
    summary: 'Delete a specific prompt asset version by its tag',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to delete' })
  @ApiResponse({ status: 200, description: 'Version deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
  ): Promise<PromptAssetVersion> {
    return this.service.remove(projectId, promptId, assetKey, versionTag);
  }

  // --- Marketplace Endpoints ---

  @Post(':versionTag/publish')
  @ApiOperation({
    summary: 'Request to publish a specific prompt asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to publish' })
  @ApiResponse({
    status: 200,
    description: 'Publish request submitted.',
    type: CreatePromptAssetVersionDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  async requestPublish(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Request() req: RequestWithUser,
  ): Promise<PromptAssetVersion> {
    this.logger.debug(
      `[requestPublish] Received request for projectId: ${projectId}, promptId: ${promptId}, assetKey: ${assetKey}, versionTag: ${versionTag}`,
    );
    const version = await this.service.findOneByTag(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
    return this.service.requestPublish(
      version.id,
      projectId,
      req.user.userId,
      req.user.tenantId,
    );
  }

  @Post(':versionTag/unpublish')
  @ApiOperation({
    summary: 'Unpublish a specific prompt asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({ name: 'versionTag', description: 'Version tag to unpublish' })
  @ApiResponse({
    status: 200,
    description: 'Version unpublished.',
    type: CreatePromptAssetVersionDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  unpublish(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
  ): Promise<PromptAssetVersion> {
    this.logger.debug(
      `[unpublish] Received request for projectId: ${projectId}, promptId: ${promptId}, assetKey: ${assetKey}, versionTag: ${versionTag}`,
    );
    return this.service.unpublish(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
  }
}
