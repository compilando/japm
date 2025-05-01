import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Put } from '@nestjs/common';
import { ConversationPromptAssetService } from './conversation-prompt-asset.service';
import { CreateConversationPromptAssetDto } from './dto/create-conversation-prompt-asset.dto';
import { UpdateConversationPromptAssetDto } from './dto/update-conversation-prompt-asset.dto';
import { CreateAssetVersionDto } from './dto/create-asset-version.dto';
import { CreateOrUpdateAssetTranslationDto } from './dto/create-or-update-asset-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { ConversationPromptAsset, ConversationPromptAssetVersion, AssetTranslation } from '@prisma/client';

class AssetTranslationParams {
    @ApiProperty({ description: 'ID del asset padre', type: String })
    assetId: string;
    @ApiProperty({ description: 'ID de la versión a traducir', type: String })
    versionId: string;
}

@ApiTags('conversation-prompt-assets')
@Controller('conversation-prompt-assets')
export class ConversationPromptAssetController {
    constructor(private readonly service: ConversationPromptAssetService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear un nuevo asset y su primera versión (v1.0.0, marcada como activa)' })
    @ApiBody({ type: CreateConversationPromptAssetDto })
    @ApiResponse({ status: 201, description: 'Asset creado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto, asset con esa Key ya existe.' })
    create(@Body() createDto: CreateConversationPromptAssetDto): Promise<ConversationPromptAsset> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los assets (con su versión activa)' })
    @ApiResponse({ status: 200, description: 'Lista de assets.' })
    findAll(): Promise<ConversationPromptAsset[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un asset por ID (con versión activa y opcionalmente historial)' })
    @ApiParam({ name: 'id', description: 'ID del asset', type: String })
    @ApiResponse({ status: 200, description: 'Asset encontrado.' })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    findOne(@Param('id') id: string): Promise<ConversationPromptAsset> {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar metadatos de un asset (nombre, descripción, tipo, categoría). No crea nueva versión.' })
    @ApiParam({ name: 'id', description: 'ID del asset a actualizar', type: String })
    @ApiBody({ type: UpdateConversationPromptAssetDto })
    @ApiResponse({ status: 200, description: 'Asset actualizado.' })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateDto: UpdateConversationPromptAssetDto): Promise<ConversationPromptAsset> {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un asset y todas sus versiones/traducciones/links.' })
    @ApiParam({ name: 'id', description: 'ID del asset a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Asset eliminado.' })
    @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
    remove(@Param('id') id: string): Promise<ConversationPromptAsset> {
        return this.service.remove(id);
    }

    @Post(':assetId/versions')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear una nueva versión para un asset existente.' })
    @ApiParam({ name: 'assetId', description: 'ID del asset padre', type: String })
    @ApiBody({ type: CreateAssetVersionDto })
    @ApiResponse({ status: 201, description: 'Nueva versión de asset creada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Asset padre no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto (e.g., versionTag ya existe para este asset).' })
    createVersion(
        @Param('assetId') assetId: string,
        @Body() createVersionDto: CreateAssetVersionDto
    ): Promise<ConversationPromptAssetVersion> {
        return this.service.createVersion(assetId, createVersionDto);
    }

    @Put(':assetId/versions/:versionId/translations')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Añadir o actualizar una traducción para una versión específica de asset.' })
    @ApiParam({ name: 'assetId', description: 'ID del asset padre', type: String })
    @ApiParam({ name: 'versionId', description: 'ID de la versión a traducir', type: String })
    @ApiBody({ type: CreateOrUpdateAssetTranslationDto })
    @ApiResponse({ status: 200, description: 'Traducción creada o actualizada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
    addOrUpdateAssetTranslation(
        @Param() params: AssetTranslationParams,
        @Body() translationDto: CreateOrUpdateAssetTranslationDto
    ): Promise<AssetTranslation> {
        return this.service.addOrUpdateTranslation(params.versionId, translationDto);
    }
}
