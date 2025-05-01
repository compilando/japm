import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, NotFoundException
} from '@nestjs/common';
import { AssetTranslationService } from './asset-translation.service';
import { CreateAssetTranslationDto } from './dto/create-asset-translation.dto';
import { UpdateAssetTranslationDto } from './dto/update-asset-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AssetTranslation } from '@prisma/client';

@ApiTags('Asset Translation')
@Controller('asset-translation')
export class AssetTranslationController {
  constructor(private readonly service: AssetTranslationService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crear una nueva traducción para una versión de asset' })
  @ApiBody({ type: CreateAssetTranslationDto })
  @ApiResponse({ status: 201, description: 'Traducción creada.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Versión del asset no encontrada.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una traducción para ese idioma en esa versión.' })
  create(@Body() createDto: CreateAssetTranslationDto): Promise<AssetTranslation> {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las traducciones de assets, opcionalmente filtradas por versionId' })
  @ApiQuery({ name: 'versionId', required: false, description: 'Filtrar traducciones por el ID de la versión del asset' })
  @ApiResponse({ status: 200, description: 'Lista de traducciones.', type: [CreateAssetTranslationDto] })
  findAll(@Query('versionId') versionId?: string): Promise<AssetTranslation[]> {
    if (versionId) {
      return this.service.findByVersionId(versionId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una traducción de asset por su ID (CUID)' })
  @ApiParam({ name: 'id', description: 'ID de la traducción', type: String })
  @ApiResponse({ status: 200, description: 'Traducción encontrada.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada.' })
  findOne(@Param('id') id: string): Promise<AssetTranslation> {
    return this.service.findOne(id);
  }

  @Get('by-version/:versionId/:languageCode')
  @ApiOperation({ summary: 'Obtener una traducción de asset específica por versión y código de idioma' })
  @ApiParam({ name: 'versionId', description: 'ID de la versión del asset', type: String })
  @ApiParam({ name: 'languageCode', description: 'Código de idioma (xx-XX)', type: String })
  @ApiResponse({ status: 200, description: 'Traducción encontrada.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada para esa combinación.' })
  async findOneByVersionAndLanguage(
    @Param('versionId') versionId: string,
    @Param('languageCode') languageCode: string
  ): Promise<AssetTranslation> {
    const translation = await this.service.findOneByVersionAndLanguage(versionId, languageCode);
    if (!translation) {
      throw new NotFoundException(`Translation not found for version ${versionId} and language ${languageCode}`);
    }
    return translation;
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualizar una traducción de asset por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la traducción a actualizar', type: String })
  @ApiBody({ type: UpdateAssetTranslationDto })
  @ApiResponse({ status: 200, description: 'Traducción actualizada.', type: CreateAssetTranslationDto })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAssetTranslationDto): Promise<AssetTranslation> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una traducción de asset por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la traducción a eliminar', type: String })
  @ApiResponse({ status: 200, description: 'Traducción eliminada.' })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada.' })
  remove(@Param('id') id: string): Promise<AssetTranslation> {
    return this.service.remove(id);
  }
}
