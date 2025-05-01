import {
  Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Query
} from '@nestjs/common';
import { ConversationPromptAssetVersionService } from './conversation-prompt-asset-version.service';
import { CreateConversationPromptAssetVersionDto } from './dto/create-conversation-prompt-asset-version.dto';
import { UpdateConversationPromptAssetVersionDto } from './dto/update-conversation-prompt-asset-version.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ConversationPromptAssetVersion } from '@prisma/client';

@ApiTags('conversation-prompt-asset-version')
@Controller('conversation-prompt-asset-version')
export class ConversationPromptAssetVersionController {
  constructor(private readonly service: ConversationPromptAssetVersionService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crear una nueva versión de un asset' })
  @ApiBody({ type: CreateConversationPromptAssetVersionDto })
  @ApiResponse({ status: 201, description: 'Versión creada.', type: CreateConversationPromptAssetVersionDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Asset lógico no encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una versión con ese tag para ese asset.' })
  create(@Body() createDto: CreateConversationPromptAssetVersionDto): Promise<ConversationPromptAssetVersion> {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las versiones de assets, opcionalmente filtradas por assetId' })
  @ApiQuery({ name: 'assetId', required: false, description: 'Filtrar versiones por el Key (slug) del asset lógico' })
  @ApiResponse({ status: 200, description: 'Lista de versiones.', type: [CreateConversationPromptAssetVersionDto] })
  findAll(@Query('assetId') assetId?: string): Promise<ConversationPromptAssetVersion[]> {
    if (assetId) {
      return this.service.findByAssetId(assetId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una versión de asset por su ID (CUID)' })
  @ApiParam({ name: 'id', description: 'ID de la versión', type: String })
  @ApiResponse({ status: 200, description: 'Versión encontrada.', type: CreateConversationPromptAssetVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  findOne(@Param('id') id: string): Promise<ConversationPromptAssetVersion> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualizar una versión de asset por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la versión a actualizar', type: String })
  @ApiBody({ type: UpdateConversationPromptAssetVersionDto })
  @ApiResponse({ status: 200, description: 'Versión actualizada.', type: CreateConversationPromptAssetVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateConversationPromptAssetVersionDto): Promise<ConversationPromptAssetVersion> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una versión de asset por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la versión a eliminar', type: String })
  @ApiResponse({ status: 200, description: 'Versión eliminada.' })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  remove(@Param('id') id: string): Promise<ConversationPromptAssetVersion> {
    return this.service.remove(id);
  }
}
