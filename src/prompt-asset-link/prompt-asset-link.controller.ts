import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { PromptAssetLinkService } from './prompt-asset-link.service';
import { CreatePromptAssetLinkDto } from './dto/create-prompt-asset-link.dto';
import { UpdatePromptAssetLinkDto } from './dto/update-prompt-asset-link.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { PromptAssetLink, Prompt, PromptAsset } from '@prisma/client';
import { CreatePromptDto } from '../prompt/dto/create-prompt.dto'; // Para respuesta
import { CreatePromptAssetDto } from '../prompt-asset/dto/create-prompt-asset.dto'; // Para respuesta

// DTO de respuesta detallado
class PromptAssetLinkResponse extends CreatePromptAssetLinkDto {
    @ApiProperty({ type: () => CreatePromptDto })
    prompt: Prompt;
    @ApiProperty({ type: () => CreatePromptAssetDto })
    asset: PromptAsset;
    // Incluir el ID del link mismo
    @ApiProperty()
    id: string;
}

@ApiTags('Prompt Asset Links')
@Controller('prompt-asset-links')
export class PromptAssetLinkController {
    constructor(private readonly service: PromptAssetLinkService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear un nuevo vínculo entre prompt y asset' })
    @ApiBody({ type: CreatePromptAssetLinkDto })
    @ApiResponse({ status: 201, description: 'Vínculo creado.', type: PromptAssetLinkResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Prompt o Asset referenciado no encontrado.' })
    create(@Body() createDto: CreatePromptAssetLinkDto): Promise<PromptAssetLink> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los vínculos prompt-asset' })
    @ApiResponse({ status: 200, description: 'Lista de vínculos.', type: [PromptAssetLinkResponse] })
    findAll(): Promise<PromptAssetLink[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un vínculo por ID' })
    @ApiParam({ name: 'id', description: 'ID del vínculo (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Vínculo encontrado.', type: PromptAssetLinkResponse })
    @ApiResponse({ status: 404, description: 'Vínculo no encontrado.' })
    findOne(@Param('id') id: string): Promise<PromptAssetLink> {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar un vínculo por ID (campos como isActive, position)' })
    @ApiParam({ name: 'id', description: 'ID del vínculo a actualizar', type: String })
    @ApiBody({ type: UpdatePromptAssetLinkDto })
    @ApiResponse({ status: 200, description: 'Vínculo actualizado.', type: PromptAssetLinkResponse })
    @ApiResponse({ status: 404, description: 'Vínculo no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateDto: UpdatePromptAssetLinkDto): Promise<PromptAssetLink> {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un vínculo por ID' })
    @ApiParam({ name: 'id', description: 'ID del vínculo a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Vínculo eliminado.' })
    @ApiResponse({ status: 404, description: 'Vínculo no encontrado.' })
    remove(@Param('id') id: string): Promise<PromptAssetLink> {
        return this.service.remove(id);
    }
}
