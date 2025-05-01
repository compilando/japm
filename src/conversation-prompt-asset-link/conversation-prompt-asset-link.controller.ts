import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConversationPromptAssetLinkService } from './conversation-prompt-asset-link.service';
import { CreateConversationPromptAssetLinkDto } from './dto/create-conversation-prompt-asset-link.dto';
import { UpdateConversationPromptAssetLinkDto } from './dto/update-conversation-prompt-asset-link.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { ConversationPromptAssetLink, ConversationPrompt, ConversationPromptAsset } from '@prisma/client';
import { CreateConversationPromptDto } from '../conversation-prompt/dto/create-conversation-prompt.dto'; // Para respuesta
import { CreateConversationPromptAssetDto } from '../conversation-prompt-asset/dto/create-conversation-prompt-asset.dto'; // Para respuesta

// DTO de respuesta detallado
class ConversationPromptAssetLinkResponse extends CreateConversationPromptAssetLinkDto {
    @ApiProperty({ type: () => CreateConversationPromptDto })
    prompt: ConversationPrompt;
    @ApiProperty({ type: () => CreateConversationPromptAssetDto })
    asset: ConversationPromptAsset;
    // Incluir el ID del link mismo
    @ApiProperty()
    id: string;
}

@ApiTags('conversation-prompt-asset-links')
@Controller('conversation-prompt-asset-links')
export class ConversationPromptAssetLinkController {
    constructor(private readonly service: ConversationPromptAssetLinkService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear un nuevo vínculo entre prompt y asset' })
    @ApiBody({ type: CreateConversationPromptAssetLinkDto })
    @ApiResponse({ status: 201, description: 'Vínculo creado.', type: ConversationPromptAssetLinkResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Prompt o Asset referenciado no encontrado.' })
    create(@Body() createDto: CreateConversationPromptAssetLinkDto): Promise<ConversationPromptAssetLink> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los vínculos prompt-asset' })
    @ApiResponse({ status: 200, description: 'Lista de vínculos.', type: [ConversationPromptAssetLinkResponse] })
    findAll(): Promise<ConversationPromptAssetLink[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un vínculo por ID' })
    @ApiParam({ name: 'id', description: 'ID del vínculo (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Vínculo encontrado.', type: ConversationPromptAssetLinkResponse })
    @ApiResponse({ status: 404, description: 'Vínculo no encontrado.' })
    findOne(@Param('id') id: string): Promise<ConversationPromptAssetLink> {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar un vínculo por ID (campos como isActive, position)' })
    @ApiParam({ name: 'id', description: 'ID del vínculo a actualizar', type: String })
    @ApiBody({ type: UpdateConversationPromptAssetLinkDto })
    @ApiResponse({ status: 200, description: 'Vínculo actualizado.', type: ConversationPromptAssetLinkResponse })
    @ApiResponse({ status: 404, description: 'Vínculo no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateDto: UpdateConversationPromptAssetLinkDto): Promise<ConversationPromptAssetLink> {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un vínculo por ID' })
    @ApiParam({ name: 'id', description: 'ID del vínculo a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Vínculo eliminado.' })
    @ApiResponse({ status: 404, description: 'Vínculo no encontrado.' })
    remove(@Param('id') id: string): Promise<ConversationPromptAssetLink> {
        return this.service.remove(id);
    }
}
