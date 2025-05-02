import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PromptVersionService } from './prompt-version.service';
import { CreatePromptVersionDto } from '../prompt/dto/create-prompt-version.dto';
import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';
import { PromptVersion } from '@prisma/client';

@ApiTags('Prompt Versions')
@Controller('prompt-versions')
export class PromptVersionController {
  constructor(private readonly service: PromptVersionService) { }

  @Get()
  @ApiOperation({ summary: 'Obtiene todas las versiones de prompts o filtra por prompt ID' })
  @ApiQuery({ name: 'promptId', required: false, description: 'ID (nombre) del prompt para filtrar versiones' })
  @ApiResponse({ status: 200, description: 'Lista de versiones.', type: [CreatePromptVersionDto] })
  findAll(@Query('promptId') promptId?: string): Promise<PromptVersion[]> {
    if (promptId) {
      return this.service.findByPromptId(promptId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una versión de prompt por su ID' })
  @ApiParam({ name: 'id', description: 'ID único de la versión del prompt' })
  @ApiResponse({ status: 200, description: 'Versión encontrada.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  findOne(@Param('id') id: string): Promise<PromptVersion> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una versión de prompt existente' })
  @ApiParam({ name: 'id', description: 'ID único de la versión a actualizar' })
  @ApiBody({ type: UpdatePromptVersionDto })
  @ApiResponse({ status: 200, description: 'Versión actualizada.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePromptVersionDto): Promise<PromptVersion> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una versión de prompt' })
  @ApiParam({ name: 'id', description: 'ID único de la versión a eliminar' })
  @ApiResponse({ status: 200, description: 'Versión eliminada.', type: CreatePromptVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<PromptVersion> {
    return this.service.remove(id);
  }
}
