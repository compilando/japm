import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, NotFoundException
} from '@nestjs/common';
import { PromptTranslationService } from './prompt-translation.service';
import { CreatePromptTranslationDto } from './dto/create-prompt-translation.dto';
import { UpdatePromptTranslationDto } from './dto/update-prompt-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PromptTranslation } from '@prisma/client';

@ApiTags('prompt-translation')
@Controller('prompt-translation')
export class PromptTranslationController {
  constructor(private readonly service: PromptTranslationService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crear una nueva traducción para una versión de prompt' })
  @ApiBody({ type: CreatePromptTranslationDto })
  @ApiResponse({ status: 201, description: 'Traducción creada.', type: CreatePromptTranslationDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Versión del prompt no encontrada.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una traducción para ese idioma en esa versión.' })
  create(@Body() createDto: CreatePromptTranslationDto): Promise<PromptTranslation> {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las traducciones, opcionalmente filtradas por versionId' })
  @ApiQuery({ name: 'versionId', required: false, description: 'Filtrar traducciones por el ID de la versión del prompt' })
  @ApiResponse({ status: 200, description: 'Lista de traducciones.', type: [CreatePromptTranslationDto] })
  findAll(@Query('versionId') versionId?: string): Promise<PromptTranslation[]> {
    if (versionId) {
      return this.service.findByVersionId(versionId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una traducción por su ID (CUID)' })
  @ApiParam({ name: 'id', description: 'ID de la traducción', type: String })
  @ApiResponse({ status: 200, description: 'Traducción encontrada.', type: CreatePromptTranslationDto })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada.' })
  findOne(@Param('id') id: string): Promise<PromptTranslation> {
    return this.service.findOne(id);
  }

  // Endpoint para buscar por versionId y languageCode?
  @Get('by-version/:versionId/:languageCode')
  @ApiOperation({ summary: 'Obtener una traducción específica por versión y código de idioma' })
  @ApiParam({ name: 'versionId', description: 'ID de la versión del prompt', type: String })
  @ApiParam({ name: 'languageCode', description: 'Código de idioma (xx-XX)', type: String })
  @ApiResponse({ status: 200, description: 'Traducción encontrada.', type: CreatePromptTranslationDto })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada para esa combinación.' })
  async findOneByVersionAndLanguage(
    @Param('versionId') versionId: string,
    @Param('languageCode') languageCode: string
  ): Promise<PromptTranslation> {
    const translation = await this.service.findOneByVersionAndLanguage(versionId, languageCode);
    if (!translation) {
      throw new NotFoundException(`Translation not found for version ${versionId} and language ${languageCode}`);
    }
    return translation;
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualizar una traducción por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la traducción a actualizar', type: String })
  @ApiBody({ type: UpdatePromptTranslationDto })
  @ApiResponse({ status: 200, description: 'Traducción actualizada.', type: CreatePromptTranslationDto })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePromptTranslationDto): Promise<PromptTranslation> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una traducción por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la traducción a eliminar', type: String })
  @ApiResponse({ status: 200, description: 'Traducción eliminada.' })
  @ApiResponse({ status: 404, description: 'Traducción no encontrada.' })
  remove(@Param('id') id: string): Promise<PromptTranslation> {
    return this.service.remove(id);
  }
}
