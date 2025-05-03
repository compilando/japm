import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, NotFoundException, HttpCode, HttpStatus, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
// import { TestPromptDto } from './dto/test-prompt.dto'; // Ya no se usa
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateOrUpdatePromptTranslationDto } from './dto/create-or-update-prompt-translation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Prompt, PromptVersion, PromptTranslation } from '@prisma/client'; // Importar solo tipos necesarios
import { ProjectGuard } from '../common/guards/project.guard'; // Importar guard
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import JwtAuthGuard
import { Request as ExpressRequest } from 'express';

// Definir interfaz para el request con projectId
interface RequestWithProject extends ExpressRequest {
    projectId: string;
}

// Clases DTO de parámetros eliminadas completamente

@ApiTags('Prompts')
@ApiBearerAuth() // Add Swagger decorator
@UseGuards(JwtAuthGuard, ProjectGuard) // Aplicar JwtAuthGuard ANTES que ProjectGuard
@Controller('/api/projects/:projectId/prompts') // Nueva ruta base
export class PromptController {
    constructor(private readonly service: PromptService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea un nuevo prompt lógico dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiBody({ type: CreatePromptDto })
    @ApiResponse({ status: 201, description: 'Prompt creado.', type: CreatePromptDto }) // Ajustar tipo de respuesta si es necesario
    @ApiResponse({ status: 400, description: 'Datos inválidos (e.g., falta promptText inicial).' })
    @ApiResponse({ status: 404, description: 'Proyecto, Tactic o Tag no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un prompt con ese nombre en el proyecto.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: RequestWithProject, @Body() createDto: CreatePromptDto): Promise<Prompt> { // Tipo de retorno podría ser más específico
        const projectId = req.projectId;
        return this.service.create(createDto, projectId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todos los prompts lógicos de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de prompts.', type: [CreatePromptDto] }) // Ajustar tipo
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    findAll(@Req() req: RequestWithProject): Promise<Prompt[]> {
        const projectId = req.projectId;
        return this.service.findAll(projectId);
    }

    // Usar :promptName como identificador dentro del proyecto
    @Get(':promptName')
    @ApiOperation({ summary: 'Obtiene un prompt lógico por su nombre dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'promptName', description: 'Nombre único del prompt dentro del proyecto' })
    @ApiResponse({ status: 200, description: 'Prompt encontrado.', type: CreatePromptDto }) // Ajustar tipo
    @ApiResponse({ status: 404, description: 'Proyecto o Prompt no encontrado.' })
    findOne(@Req() req: RequestWithProject, @Param('promptName') promptName: string): Promise<Prompt> { // Tipo de retorno podría ser más específico
        const projectId = req.projectId;
        return this.service.findOne(promptName, projectId);
    }

    @Patch(':promptName')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualiza metadatos de un prompt lógico (descripción, tactic, tags) dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'promptName', description: 'Nombre único del prompt a actualizar dentro del proyecto' })
    @ApiBody({ type: UpdatePromptDto })
    @ApiResponse({ status: 200, description: 'Prompt actualizado.', type: CreatePromptDto }) // Ajustar tipo
    @ApiResponse({ status: 404, description: 'Proyecto, Prompt, Tactic o Tag no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(
        @Req() req: RequestWithProject,
        @Param('promptName') promptName: string,
        @Body() updateDto: UpdatePromptDto
    ): Promise<Prompt> { // Tipo de retorno podría ser más específico
        const projectId = req.projectId;
        return this.service.update(promptName, updateDto, projectId);
    }

    @Delete(':promptName')
    @ApiOperation({ summary: 'Elimina un prompt lógico (y sus versiones asociadas por Cascade) dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'promptName', description: 'Nombre único del prompt a eliminar dentro del proyecto' })
    @ApiResponse({ status: 200, description: 'Prompt eliminado.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Prompt no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto al eliminar (revisar relaciones sin Cascade).' })
    @HttpCode(HttpStatus.OK)
    remove(@Req() req: RequestWithProject, @Param('promptName') promptName: string): Promise<Prompt> {
        const projectId = req.projectId;
        return this.service.remove(promptName, projectId);
    }

    // --- Endpoints de Versiones --- //

    @Post(':promptName/versions')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear una nueva versión para un prompt existente en el proyecto.' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'promptName', description: 'Nombre del prompt padre dentro del proyecto' })
    @ApiBody({ type: CreatePromptVersionDto })
    @ApiResponse({ status: 201, description: 'Nueva versión creada.' /* , type: PromptVersionDto */ })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Proyecto, Prompt padre, AssetVersion o Environment no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto (e.g., versionTag ya existe para este prompt).' })
    createVersion(
        @Req() req: RequestWithProject,
        @Param('promptName') promptName: string,
        @Body() createVersionDto: CreatePromptVersionDto
    ): Promise<PromptVersion> {
        const projectId = req.projectId;
        return this.service.createVersion(promptName, createVersionDto, projectId);
    }

    // --- Endpoints de Traducciones --- //

    @Put(':promptName/versions/:versionId/translations')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Añadir o actualizar una traducción para una versión específica de prompt en el proyecto.' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'promptName', description: 'Nombre del prompt padre (contextual)', type: String })
    @ApiParam({ name: 'versionId', description: 'ID de la versión a traducir (CUID)', type: String })
    @ApiBody({ type: CreateOrUpdatePromptTranslationDto })
    @ApiResponse({ status: 200, description: 'Traducción creada o actualizada.' /* , type: PromptTranslationDto */ })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Versión no encontrada.' })
    addOrUpdateTranslation(
        @Req() req: RequestWithProject,
        @Param('versionId') versionId: string,
        // promptName no se necesita pasar al servicio si versionId es suficiente
        @Body() translationDto: CreateOrUpdatePromptTranslationDto
    ): Promise<PromptTranslation> {
        const projectId = req.projectId;
        // El servicio valida que versionId pertenece al proyecto
        return this.service.addOrUpdateTranslation(versionId, translationDto, projectId);
    }
}
