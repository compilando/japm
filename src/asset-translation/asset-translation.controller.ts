import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, NotFoundException, UseGuards, Request
} from '@nestjs/common';
import { AssetTranslationService } from './asset-translation.service';
import { CreateAssetTranslationDto } from './dto/create-asset-translation.dto';
import { UpdateAssetTranslationDto } from './dto/update-asset-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AssetTranslation } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';

@ApiTags('Asset Translations (within Project/Asset/Version)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('api/projects/:projectId/assets/:assetKey/versions/:versionTag/translations')
export class AssetTranslationController {
  constructor(private readonly service: AssetTranslationService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a translation for a specific asset version within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version Tag' })
  @ApiBody({ type: CreateAssetTranslationDto })
  @ApiResponse({ status: 201, description: 'Translation created.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, or Version not found.' })
  @ApiResponse({ status: 409, description: 'Translation for this language already exists for this version.' })
  create(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Body() createDto: CreateAssetTranslationDto
  ): Promise<AssetTranslation> {
    return this.service.create(projectId, assetKey, versionTag, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all translations for a specific asset version within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version Tag' })
  @ApiResponse({ status: 200, description: 'List of translations.', type: [CreateAssetTranslationDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, or Version not found.' })
  findAll(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string
  ): Promise<AssetTranslation[]> {
    return this.service.findAllForVersion(projectId, assetKey, versionTag);
  }

  @Get(':languageCode')
  @ApiOperation({ summary: 'Get a specific translation by language code for an asset version' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version Tag' })
  @ApiParam({ name: 'languageCode', description: 'Language code (e.g., es-ES)' })
  @ApiResponse({ status: 200, description: 'Translation found.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, Version, or Translation not found.' })
  findOneByLanguage(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string
  ): Promise<AssetTranslation> {
    return this.service.findOneByLanguage(projectId, assetKey, versionTag, languageCode);
  }

  @Patch(':languageCode')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Update a specific translation by language code for an asset version' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version Tag' })
  @ApiParam({ name: 'languageCode', description: 'Language code of the translation to update' })
  @ApiBody({ type: UpdateAssetTranslationDto })
  @ApiResponse({ status: 200, description: 'Translation updated.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, Version, or Translation not found.' })
  update(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
    @Body() updateDto: UpdateAssetTranslationDto
  ): Promise<AssetTranslation> {
    return this.service.update(projectId, assetKey, versionTag, languageCode, updateDto);
  }

  @Delete(':languageCode')
  @ApiOperation({ summary: 'Delete a specific translation by language code for an asset version' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'assetKey', description: 'Asset Key' })
  @ApiParam({ name: 'versionTag', description: 'Version Tag' })
  @ApiParam({ name: 'languageCode', description: 'Language code of the translation to delete' })
  @ApiResponse({ status: 200, description: 'Translation deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  @ApiResponse({ status: 404, description: 'Project, Asset, Version, or Translation not found.' })
  remove(
    @Param('projectId') projectId: string,
    @Param('assetKey') assetKey: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string
  ): Promise<AssetTranslation> {
    return this.service.remove(projectId, assetKey, versionTag, languageCode);
  }
}
