import {
  Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Query
} from '@nestjs/common';
import { ConversationPromptVersionService } from './conversation-prompt-version.service';
import { CreateConversationPromptVersionDto } from './dto/create-conversation-prompt-version.dto';
import { UpdateConversationPromptVersionDto } from './dto/update-conversation-prompt-version.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ConversationPromptVersion } from '@prisma/client';

@ApiTags('conversation-prompt-version')
@Controller('conversation-prompt-version')
export class ConversationPromptVersionController {
  constructor(private readonly service: ConversationPromptVersionService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crear una nueva versión de un prompt' })
  @ApiBody({ type: CreateConversationPromptVersionDto })
  @ApiResponse({ status: 201, description: 'Versión creada.', type: CreateConversationPromptVersionDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Prompt lógico no encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una versión con ese tag para ese prompt.' })
  create(@Body() createDto: CreateConversationPromptVersionDto): Promise<ConversationPromptVersion> {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las versiones de prompts, opcionalmente filtradas por promptId' })
  @ApiQuery({ name: 'promptId', required: false, description: 'Filtrar versiones por el ID (slug) del prompt lógico' })
  @ApiResponse({ status: 200, description: 'Lista de versiones.', type: [CreateConversationPromptVersionDto] })
  findAll(@Query('promptId') promptId?: string): Promise<ConversationPromptVersion[]> {
    if (promptId) {
      return this.service.findByPromptId(promptId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una versión de prompt por su ID (CUID)' })
  @ApiParam({ name: 'id', description: 'ID de la versión', type: String })
  @ApiResponse({ status: 200, description: 'Versión encontrada.', type: CreateConversationPromptVersionDto }) // Ajustar DTO de respuesta si es necesario
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  findOne(@Param('id') id: string): Promise<ConversationPromptVersion> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualizar una versión de prompt por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la versión a actualizar', type: String })
  @ApiBody({ type: UpdateConversationPromptVersionDto })
  @ApiResponse({ status: 200, description: 'Versión actualizada.', type: CreateConversationPromptVersionDto })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateConversationPromptVersionDto): Promise<ConversationPromptVersion> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una versión de prompt por su ID' })
  @ApiParam({ name: 'id', description: 'ID de la versión a eliminar', type: String })
  @ApiResponse({ status: 200, description: 'Versión eliminada.' })
  @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
  remove(@Param('id') id: string): Promise<ConversationPromptVersion> {
    return this.service.remove(id);
  }
}
