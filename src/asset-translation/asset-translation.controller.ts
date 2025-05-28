import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Logger,
  SetMetadata,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AssetTranslationService } from './asset-translation.service';
import { CreateAssetTranslationDto } from './dto/create-asset-translation.dto';
import { UpdateAssetTranslationDto } from './dto/update-asset-translation.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssetTranslation } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ProjectGuard,
  PROJECT_ID_PARAM_KEY,
} from '../common/guards/project.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags(
  'Asset Translations (Project > Prompt > Asset > Version > Translation)',
)
@ApiBearerAuth()
@ApiParam({
  name: 'projectId',
  description: 'ID of the Project',
  required: true,
  type: String,
})
@ApiParam({
  name: 'promptId',
  description: 'ID (slug) of the Prompt',
  required: true,
  type: String,
})
@ApiParam({
  name: 'assetKey',
  description: 'Key of the PromptAsset',
  required: true,
  type: String,
})
@ApiParam({
  name: 'versionTag',
  description: 'Tag of the PromptAssetVersion',
  required: true,
  type: String,
})
@Controller(
  'projects/:projectId/prompts/:promptId/assets/:assetKey/versions/:versionTag/translations',
)
export class AssetTranslationController {
  private readonly logger = new Logger(AssetTranslationController.name);

  constructor(private readonly service: AssetTranslationService) {
    this.logger.log('[AssetTranslationController] Constructor called');
  }

  @Post()
  @UseGuards(JwtAuthGuard, ProjectGuard)
  @SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Create a translation for a specific asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({
    name: 'versionTag',
    description: 'Tag of the PromptAssetVersion',
  })
  @ApiBody({ type: CreateAssetTranslationDto })
  @ApiResponse({
    status: 201,
    description: 'Translation created.',
    type: CreateAssetTranslationDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Translation for this language already exists for this version.',
  })
  create(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Body() createDto: CreateAssetTranslationDto,
  ): Promise<AssetTranslation> {
    this.logger.debug(
      `[create] Received request for projectId: ${projectId}, promptId: ${promptId}, assetKey: ${assetKey}, versionTag: ${versionTag}. Body: ${JSON.stringify(createDto, null, 2)}`,
    );
    return this.service.create(
      projectId,
      promptId,
      assetKey,
      versionTag,
      createDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, ProjectGuard)
  @SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
  @ApiOperation({
    summary: 'Get all translations for a specific asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({
    name: 'versionTag',
    description: 'Tag of the PromptAssetVersion',
  })
  @ApiResponse({
    status: 200,
    description: 'List of translations.',
    type: [CreateAssetTranslationDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, or Version not found.',
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssetTranslation[]> {
    this.logger.log(
      `[AssetTranslationController] findAll ENTRY (GUARDS RESTORED). User from req: ${JSON.stringify(req.user)}. Params: projectId=${projectId}, promptId=${promptId}, assetKey=${assetKey}, versionTag=${versionTag}`,
    );
    return this.service.findAllForVersion(
      projectId,
      promptId,
      assetKey,
      versionTag,
    );
  }

  @Get(':languageCode')
  @UseGuards(JwtAuthGuard, ProjectGuard)
  @SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
  @ApiOperation({
    summary: 'Get a specific translation by language code for an asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({
    name: 'versionTag',
    description: 'Tag of the PromptAssetVersion',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code (e.g., es-ES)',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Translation found.',
    type: CreateAssetTranslationDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, Version, or Translation not found.',
  })
  findOneByLanguage(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
  ): Promise<AssetTranslation> {
    return this.service.findOneByLanguage(
      projectId,
      promptId,
      assetKey,
      versionTag,
      languageCode,
    );
  }

  @Patch(':languageCode')
  @UseGuards(JwtAuthGuard, ProjectGuard)
  @SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({
    summary:
      'Update a specific translation by language code for an asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({
    name: 'versionTag',
    description: 'Tag of the PromptAssetVersion',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code of the translation to update',
    required: true,
    type: String,
  })
  @ApiBody({ type: UpdateAssetTranslationDto })
  @ApiResponse({
    status: 200,
    description: 'Translation updated.',
    type: CreateAssetTranslationDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, Version, or Translation not found.',
  })
  update(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
    @Body() updateDto: UpdateAssetTranslationDto,
  ): Promise<AssetTranslation> {
    this.logger.debug(
      `[update] Received PATCH for projectId: ${projectId}, promptId: ${promptId}, assetKey: ${assetKey}, versionTag: ${versionTag}, languageCode: ${languageCode}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    );
    return this.service.update(
      projectId,
      promptId,
      assetKey,
      versionTag,
      languageCode,
      updateDto,
    );
  }

  @Delete(':languageCode')
  @UseGuards(JwtAuthGuard, ProjectGuard)
  @SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
  @ApiOperation({
    summary:
      'Delete a specific translation by language code for an asset version',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the Project the Prompt belongs to',
  })
  @ApiParam({ name: 'promptId', description: 'ID (slug) of the Prompt' })
  @ApiParam({ name: 'assetKey', description: 'Key of the PromptAsset' })
  @ApiParam({
    name: 'versionTag',
    description: 'Tag of the PromptAssetVersion',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code of the translation to delete',
    required: true,
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Translation deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Asset, Version, or Translation not found.',
  })
  remove(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
  ): Promise<AssetTranslation> {
    return this.service.remove(
      projectId,
      promptId,
      assetKey,
      versionTag,
      languageCode,
    );
  }
}
