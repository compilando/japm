import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PromptAssetService } from './prompt-asset.service';
import { CreatePromptAssetDto } from './dto/create-prompt-asset.dto';
import { UpdatePromptAssetDto } from './dto/update-prompt-asset.dto';
import { CreateAssetVersionDto } from '../prompt-asset-version/dto/create-asset-version.dto';
import { PromptAsset, PromptAssetVersion, AssetTranslation } from '@prisma/client';
import { AssetWithInitialVersion } from './prompt-asset.service';
import { CreateOrUpdateAssetTranslationDto } from 'src/asset-translation/dto/create-or-update-asset-translation.dto';

@ApiTags('Prompt Assets')
@Controller('prompt-assets')
export class PromptAssetController {
    constructor(private readonly service: PromptAssetService) { }

    @Post()
    @ApiOperation({ summary: 'Crea un nuevo asset y su primera versión (v1.0.0)' })
    @ApiBody({ type: CreatePromptAssetDto })
    @ApiResponse({ status: 201, description: 'Asset creado con su versión inicial.', type: CreatePromptAssetDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto, la clave del asset ya existe.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createDto: CreatePromptAssetDto): Promise<AssetWithInitialVersion> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todos los assets (sin historial completo de versiones)' })
    @ApiResponse({ status: 200, description: 'Lista de assets.', type: [CreatePromptAssetDto] })
    findAll(): Promise<PromptAsset[]> {
        return this.service.findAll();
    }

    @Get(':key')
    @ApiOperation({ summary: 'Obtiene un asset por su clave única, incluyendo todas sus versiones y traducciones' })
    @ApiParam({ name: 'key', description: 'Clave única del asset' })
    @ApiResponse({ status: 200, description: 'Asset encontrado.', type: CreatePromptAssetDto })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    findOne(@Param('key') key: string): Promise<PromptAsset> {
        return this.service.findOne(key);
    }

    @Patch(':key')
    @ApiOperation({ summary: 'Actualiza los metadatos de un asset (nombre, descripción, etc.). No actualiza el valor.' })
    @ApiParam({ name: 'key', description: 'Clave única del asset a actualizar' })
    @ApiBody({ type: UpdatePromptAssetDto })
    @ApiResponse({ status: 200, description: 'Asset actualizado.', type: CreatePromptAssetDto })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('key') key: string, @Body() updateDto: UpdatePromptAssetDto): Promise<PromptAsset> {
        return this.service.update(key, updateDto);
    }

    @Delete(':key')
    @ApiOperation({ summary: 'Elimina un asset y todas sus versiones, traducciones y links asociados' })
    @ApiParam({ name: 'key', description: 'Clave única del asset a eliminar' })
    @ApiResponse({ status: 200, description: 'Asset eliminado.', type: CreatePromptAssetDto })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    @HttpCode(HttpStatus.OK)
    remove(@Param('key') key: string): Promise<PromptAsset> {
        return this.service.remove(key);
    }

    @Post(':assetKey/versions')
    @ApiOperation({ summary: 'Crea una nueva versión para un asset existente' })
    @ApiParam({ name: 'assetKey', description: 'Clave del asset padre' })
    @ApiBody({ type: CreateAssetVersionDto })
    @ApiResponse({ status: 201, description: 'Versión creada.', type: CreateAssetVersionDto })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    @ApiResponse({ status: 409, description: 'La etiqueta de versión ya existe para este asset.' })
    @HttpCode(HttpStatus.CREATED)
    createVersion(
        @Param('assetKey') assetKey: string,
        @Body() createVersionDto: CreateAssetVersionDto
    ): Promise<PromptAssetVersion> {
        return this.service.createVersion(assetKey, createVersionDto);
    }

    @Post('versions/:versionId/translations')
    @ApiOperation({ summary: 'Añade o actualiza una traducción para una versión de asset específica' })
    @ApiParam({ name: 'versionId', description: 'ID de la versión del asset' })
    @ApiBody({ type: CreateOrUpdateAssetTranslationDto })
    @ApiResponse({ status: 201, description: 'Traducción creada/actualizada.', type: CreateOrUpdateAssetTranslationDto })
    @ApiResponse({ status: 404, description: 'Versión del asset no encontrada.' })
    @HttpCode(HttpStatus.CREATED)
    addOrUpdateTranslation(
        @Param('versionId') versionId: string,
        @Body() translationDto: CreateOrUpdateAssetTranslationDto
    ): Promise<AssetTranslation> {
        return this.service.addOrUpdateTranslation(versionId, translationDto);
    }
}
