import {
  Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UsePipes, ValidationPipe, Query
} from '@nestjs/common';
import { PromptAssetVersionService } from './prompt-asset-version.service';
import { CreatePromptAssetVersionDto } from './dto/create-prompt-asset-version.dto';
import { UpdatePromptAssetVersionDto } from './dto/update-prompt-asset-version.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PromptAssetVersion } from '@prisma/client';

@ApiTags('Prompt Asset Versions')
@Controller('prompt-asset-versions')
export class PromptAssetVersionController {
  constructor(private readonly service: PromptAssetVersionService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crea una nueva versión para un asset (Requiere assetId en el body)' })
  @ApiBody({ type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 201, description: 'Versión creada.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 404, description: 'Asset no encontrado.' })
  @ApiResponse({ status: 409, description: 'La etiqueta de versión ya existe para este asset.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtiene todas las versiones de assets' })
  @ApiResponse({ status: 200, description: 'Lista de versiones de assets.', type: [CreatePromptAssetVersionDto] })
  findAll(): Promise<PromptAssetVersion[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una versión de asset por su ID' })
  @ApiParam({ name: 'id', description: 'ID único de la versión del asset' })
  @ApiResponse({ status: 200, description: 'Versión encontrada.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  findOne(@Param('id') id: string): Promise<PromptAssetVersion> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualiza una versión de asset (solo value y changeMessage)' })
  @ApiParam({ name: 'id', description: 'ID único de la versión a actualizar' })
  @ApiBody({ type: UpdatePromptAssetVersionDto })
  @ApiResponse({ status: 200, description: 'Versión actualizada.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePromptAssetVersionDto): Promise<PromptAssetVersion> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una versión de asset' })
  @ApiParam({ name: 'id', description: 'ID único de la versión a eliminar' })
  @ApiResponse({ status: 200, description: 'Versión eliminada.', type: CreatePromptAssetVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<PromptAssetVersion> {
    return this.service.remove(id);
  }
}
