import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, NotFoundException, HttpCode, HttpStatus, Put, Query } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
// import { TestPromptDto } from './dto/test-prompt.dto'; // Ya no se usa
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { Prompt, Prisma, PromptVersion, PromptTranslation } from '@prisma/client'; // Importar solo tipos necesarios

// TODO: Actualizar DTOs de respuesta para reflejar el nuevo esquema (versiones, etc.)
// Quitar referencias a Region, isActive, etc.
// class PromptResponse extends CreatePromptDto {
//     @ApiProperty({ type: () => CreateRegionDto, required: false })
//     region?: Region;
//     @ApiProperty({ type: () => CreateTacticDto, required: false })
//     tactic?: Tactic;
//     @ApiProperty({ description: 'Indica si el prompt está activo', type: Boolean })
//     isActive: boolean;
//     // @ApiProperty({ type: () => [PromptAssetLinkResponseDto] }) // DTO complejo
//     // assets: PromptAssetLink[];
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

@ApiTags('Prompts')
@Controller('prompts')
export class PromptController {
    constructor(private readonly service: PromptService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea un nuevo prompt lógico' })
    @ApiBody({ type: CreatePromptDto })
    @ApiResponse({ status: 201, description: 'Prompt creado.', type: CreatePromptDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un prompt con ese nombre.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createDto: CreatePromptDto): Promise<Prompt> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todos los prompts lógicos' })
    @ApiResponse({ status: 200, description: 'Lista de prompts.', type: [CreatePromptDto] })
    findAll(): Promise<Prompt[]> {
        return this.service.findAll();
    }

    @Get(':name')
    @ApiOperation({ summary: 'Obtiene un prompt lógico por su nombre (ID)' })
    @ApiParam({ name: 'name', description: 'Nombre único del prompt' })
    @ApiResponse({ status: 200, description: 'Prompt encontrado.', type: CreatePromptDto })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    findOne(@Param('name') name: string): Promise<Prompt> {
        return this.service.findOne(name);
    }

    @Patch(':name')
    @ApiOperation({ summary: 'Actualiza un prompt lógico' })
    @ApiParam({ name: 'name', description: 'Nombre único del prompt a actualizar' })
    @ApiBody({ type: UpdatePromptDto })
    @ApiResponse({ status: 200, description: 'Prompt actualizado.', type: CreatePromptDto })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('name') name: string, @Body() updateDto: UpdatePromptDto): Promise<Prompt> {
        return this.service.update(name, updateDto);
    }

    @Delete(':name')
    @ApiOperation({ summary: 'Elimina un prompt lógico (y posiblemente sus versiones?)' })
    @ApiParam({ name: 'name', description: 'Nombre único del prompt a eliminar' })
    @ApiResponse({ status: 200, description: 'Prompt eliminado.' })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    @HttpCode(HttpStatus.OK)
    remove(@Param('name') name: string): Promise<Prompt> {
        return this.service.remove(name);
    }

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
    ): Promise<PromptVersion> {
        return this.service.createVersion(promptId, createVersionDto);
    }

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
        return this.service.addOrUpdateTranslation(params.versionId, translationDto);
    }

}
