import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PromptTranslationService } from './prompt-translation.service';
import { CreatePromptTranslationDto } from './dto/create-prompt-translation.dto';
import { UpdatePromptTranslationDto } from './dto/update-prompt-translation.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromptTranslation } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';
import { ResolveAssetsQueryDto } from '../serve-prompt/dto/resolve-assets-query.dto';
import { Logger } from '@nestjs/common';

@ApiTags('Prompt Translations (within Project/Prompt/Version)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller(
  'projects/:projectId/prompts/:promptId/versions/:versionTag/translations',
)
export class PromptTranslationController {
  private readonly logger = new Logger(PromptTranslationController.name);

  constructor(private readonly service: PromptTranslationService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary:
      'Create a translation for a specific prompt version within a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({
    name: 'versionTag',
    description:
      'Version Tag (e.g., 1.0.0) or "latest" to get the most recent version',
  })
  @ApiBody({ type: CreatePromptTranslationDto })
  @ApiResponse({
    status: 201,
    description: 'Translation created.',
    type: CreatePromptTranslationDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data (e.g., missing languageCode).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, or Version not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Translation for this language already exists for this version.',
  })
  create(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string,
    @Body() createDto: CreatePromptTranslationDto,
  ): Promise<PromptTranslation> {
    return this.service.create(projectId, promptId, versionTag, createDto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Get all translations for a specific prompt version within a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({
    name: 'versionTag',
    description:
      'Version Tag (e.g., 1.0.0) or "latest" to get the most recent version',
  })
  @ApiResponse({
    status: 200,
    description: 'List of translations.',
    type: [CreatePromptTranslationDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, or Version not found.',
  })
  findAll(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string,
  ): Promise<PromptTranslation[]> {
    return this.service.findAllForVersion(projectId, promptId, versionTag);
  }

  @Get(':languageCode')
  @ApiOperation({
    summary:
      'Get a specific translation by language code for a prompt version. Allows resolving assets.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({
    name: 'versionTag',
    description:
      'Version Tag (e.g., 1.0.0) or "latest" to get the most recent version',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code (e.g., es-ES)',
    required: true,
  })
  @ApiQuery({
    name: 'resolveAssets',
    description: 'Whether to resolve asset placeholders. Defaults to false.',
    type: Boolean,
    required: false,
    example: 'true',
  })
  @ApiQuery({
    name: 'environmentId',
    description: 'Environment ID for context.',
    type: String,
    required: false,
    example: 'dev-env-123',
  })
  @ApiQuery({
    name: 'regionCode',
    description:
      'Region code for context (e.g., for asset translations - overrides languageCode for assets if provided).',
    type: String,
    required: false,
    example: 'us-east-1',
  })
  @ApiQuery({
    name: 'variables',
    description: 'JSON stringified object of variables for substitution.',
    type: String,
    required: false,
    example: '{"varName": "value"}',
  })
  @ApiQuery({
    name: 'processed',
    description:
      'Whether to return the processed prompt with all references and variables resolved. Defaults to false.',
    type: Boolean,
    required: false,
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: 'Translation found.',
    type: CreatePromptTranslationDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, Version, or Translation not found.',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findOneByLanguage(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
    @Query() query: ResolveAssetsQueryDto,
  ): Promise<PromptTranslation> {
    this.logger.debug(
      `Finding translation for prompt ${promptId}, version ${versionTag}, language ${languageCode} with query params: ${JSON.stringify(query)}`,
    );
    return this.service.findOneByLanguage(
      projectId,
      promptId,
      versionTag,
      languageCode,
      query,
    );
  }

  @Patch(':languageCode')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({
    summary:
      'Update a specific translation by language code for a prompt version',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({
    name: 'versionTag',
    description:
      'Version Tag (e.g., 1.0.0) or "latest" to get the most recent version',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code of the translation to update',
    required: true,
  })
  @ApiBody({ type: UpdatePromptTranslationDto })
  @ApiResponse({
    status: 200,
    description: 'Translation updated.',
    type: CreatePromptTranslationDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, Version, or Translation not found.',
  })
  update(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
    @Body() updateDto: UpdatePromptTranslationDto,
  ): Promise<PromptTranslation> {
    return this.service.update(
      projectId,
      promptId,
      versionTag,
      languageCode,
      updateDto,
    );
  }

  @Delete(':languageCode')
  @ApiOperation({
    summary:
      'Delete a specific translation by language code for a prompt version',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'promptId', description: 'Prompt CUID' })
  @ApiParam({
    name: 'versionTag',
    description:
      'Version Tag (e.g., 1.0.0) or "latest" to get the most recent version',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code of the translation to delete',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Translation deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, Version, or Translation not found.',
  })
  remove(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
  ): Promise<PromptTranslation> {
    return this.service.remove(projectId, promptId, versionTag, languageCode);
  }
}
