import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, NotFoundException, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ConversationPromptService } from './conversation-prompt.service';
import { CreateConversationPromptDto } from './dto/create-conversation-prompt.dto';
import { UpdateConversationPromptDto } from './dto/update-conversation-prompt.dto';
// import { TestPromptDto } from './dto/test-prompt.dto'; // Ya no se usa
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { ConversationPrompt, Prisma, ConversationPromptVersion, PromptTranslation } from '@prisma/client'; // Importar solo tipos necesarios

// TODO: Actualizar DTOs de respuesta para reflejar el nuevo esquema (versiones, etc.)
// Quitar referencias a Region, isActive, etc.
// class ConversationPromptResponse extends CreateConversationPromptDto {
//     @ApiProperty({ type: () => CreateRegionDto, required: false })
//     region?: Region;
//     @ApiProperty({ type: () => CreateConversationTacticDto, required: false })
//     tactic?: ConversationTactic;
//     @ApiProperty({ description: 'Indica si el prompt está activo', type: Boolean })
//     isActive: boolean;
//     // @ApiProperty({ type: () => [ConversationPromptAssetLinkResponseDto] }) // DTO complejo
//     // assets: ConversationPromptAssetLink[];
// }

// DTO simple para activar versión (solo para Swagger/validación si es necesario)
class ActivateVersionParams {
    @ApiProperty({ description: 'ID del prompt padre', type: String })
    promptId: string;
    @ApiProperty({ description: 'ID de la versión a activar', type: String })
    versionId: string;
}

// DTO para parámetros de ruta de traducción
class TranslationParams {
    @ApiProperty({ description: 'ID del prompt padre', type: String })
    promptId: string;
    @ApiProperty({ description: 'ID de la versión a traducir', type: String })
    versionId: string;
}

@ApiTags('conversation-prompts')
@Controller('conversation-prompts')
export class ConversationPromptController {
    constructor(private readonly service: ConversationPromptService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear un nuevo prompt y su primera versión (v1.0.0, marcada como activa)' })
    @ApiBody({ type: CreateConversationPromptDto })
    @ApiResponse({ status: 201, description: 'Prompt creado.' /*, type: ConversationPromptResponse */ })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto (e.g., nombre ya existe).' })
    create(@Body() createDto: CreateConversationPromptDto): Promise<ConversationPrompt> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los prompts (con su versión activa)' })
    @ApiResponse({ status: 200, description: 'Lista de prompts.' /*, type: [ConversationPromptResponse] */ })
    findAll(): Promise<ConversationPrompt[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un prompt por ID (con detalles de versión activa y historial opcional)' })
    @ApiParam({ name: 'id', description: 'ID del prompt', type: String })
    @ApiResponse({ status: 200, description: 'Prompt encontrado.' /*, type: ConversationPromptResponse */ })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    findOne(@Param('id') id: string): Promise<ConversationPrompt> {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar metadatos de un prompt (nombre, descripción, táctica). No crea nueva versión.' })
    @ApiParam({ name: 'id', description: 'ID del prompt a actualizar', type: String })
    @ApiBody({ type: UpdateConversationPromptDto })
    @ApiResponse({ status: 200, description: 'Prompt actualizado.' /*, type: ConversationPromptResponse */ })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateDto: UpdateConversationPromptDto): Promise<ConversationPrompt> {
        // Recordar: Este update es limitado, solo actualiza el prompt principal.
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un prompt y todas sus versiones/traducciones/links asociados.' })
    @ApiParam({ name: 'id', description: 'ID del prompt a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Prompt eliminado.' })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    remove(@Param('id') id: string): Promise<ConversationPrompt> {
        return this.service.remove(id);
    }

    // Ruta actualizada para activar una versión específica
    @Patch(':promptId/versions/:versionId/activate')
    @ApiOperation({ summary: 'Activar una versión específica de un prompt' })
    @ApiParam({ name: 'promptId', description: 'ID del prompt padre', type: String })
    @ApiParam({ name: 'versionId', description: 'ID de la versión a activar', type: String })
    @ApiResponse({ status: 200, description: 'Versión activada.' /*, type: ConversationPromptResponse */ })
    @ApiResponse({ status: 404, description: 'Prompt o Versión no encontrados.' })
    activateVersion(@Param() params: ActivateVersionParams): Promise<ConversationPrompt> {
        // Llamar al método refactorizado del servicio
        return this.service.activateVersion(params.promptId, params.versionId);
    }

    // Ruta sin cambios, pero llama al método refactorizado del servicio
    @Patch(':promptId/deactivate')
    @ApiOperation({ summary: 'Desactivar la versión activa de un prompt' })
    @ApiParam({ name: 'promptId', description: 'ID del prompt a desactivar', type: String })
    @ApiResponse({ status: 200, description: 'Prompt desactivado (sin versión activa).' /*, type: ConversationPromptResponse */ })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    deactivate(@Param('promptId') promptId: string): Promise<ConversationPrompt> {
        return this.service.deactivate(promptId);
    }

    // Endpoint de test eliminado - usar /serve-prompt para probar ensamblaje
    // @Post(':id/test')
    // ... (código eliminado)

    @Post(':promptId/versions')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear una nueva versión para un prompt existente.' })
    @ApiParam({ name: 'promptId', description: 'ID del prompt padre', type: String })
    @ApiBody({ type: CreatePromptVersionDto })
    @ApiResponse({ status: 201, description: 'Nueva versión creada.' /* Podríamos definir un DTO específico para la respuesta de versión */ })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Prompt padre no encontrado o AssetVersion en link no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto (e.g., versionTag ya existe para este prompt).' })
    createVersion(
        @Param('promptId') promptId: string,
        @Body() createVersionDto: CreatePromptVersionDto
    ): Promise<ConversationPromptVersion> { // Devuelve la nueva versión creada
        return this.service.createVersion(promptId, createVersionDto);
    }

    // --- Gestión de Traducciones ---

    @Put(':promptId/versions/:versionId/translations')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Añadir o actualizar una traducción para una versión específica de prompt.' })
    @ApiParam({ name: 'promptId', description: 'ID del prompt padre', type: String })
    @ApiParam({ name: 'versionId', description: 'ID de la versión a traducir', type: String })
    @ApiBody({ type: CreateOrUpdatePromptTranslationDto })
    @ApiResponse({ status: 200, description: 'Traducción creada o actualizada.' /* Podríamos definir un DTO */ })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Versión no encontrada.' })
    addOrUpdateTranslation(
        @Param() params: TranslationParams,
        @Body() translationDto: CreateOrUpdatePromptTranslationDto
    ): Promise<PromptTranslation> {
        // Podríamos verificar que params.promptId coincide con la versión, pero el servicio ya valida versionId
        return this.service.addOrUpdateTranslation(params.versionId, translationDto);
    }

    // TODO: Endpoint para eliminar una traducción?
    // @Delete(':promptId/versions/:versionId/translations/:languageCode') ...

}
