import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, NotFoundException, HttpCode, HttpStatus, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PromptAssetService } from './prompt-asset.service';
import { CreatePromptAssetDto } from './dto/create-prompt-asset.dto';
import { UpdatePromptAssetDto } from './dto/update-prompt-asset.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PromptAsset, PromptAssetVersion } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

interface RequestWithProject extends ExpressRequest {
    projectId: string;
}

@ApiTags('Prompt Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('/api/projects/:projectId/prompt-assets')
export class PromptAssetController {
    constructor(private readonly service: PromptAssetService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea un nuevo prompt asset (y su primera versión) dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiBody({ type: CreatePromptAssetDto })
    @ApiResponse({ status: 201, description: 'Asset creado con su versión inicial.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos (e.g., falta initialValue).' })
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un asset con esa key en el proyecto.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: RequestWithProject, @Body() createDto: CreatePromptAssetDto) {
        const projectId = req.projectId;
        return this.service.create(createDto, projectId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todos los prompt assets de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de assets.' })
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    findAll(@Req() req: RequestWithProject) {
        const projectId = req.projectId;
        return this.service.findAll(projectId);
    }

    @Get(':assetKey')
    @ApiOperation({ summary: 'Obtiene un prompt asset por su key dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'assetKey', description: 'Key única del asset dentro del proyecto' })
    @ApiResponse({ status: 200, description: 'Asset encontrado con detalles.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Asset no encontrado.' })
    findOne(@Req() req: RequestWithProject, @Param('assetKey') key: string) {
        const projectId = req.projectId;
        return this.service.findOne(key, projectId);
    }

    @Patch(':assetKey')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualiza metadatos de un prompt asset (nombre, descripción, etc.) dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'assetKey', description: 'Key única del asset a actualizar' })
    @ApiBody({ type: UpdatePromptAssetDto })
    @ApiResponse({ status: 200, description: 'Asset actualizado.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Asset no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(
        @Req() req: RequestWithProject,
        @Param('assetKey') key: string,
        @Body() updateDto: UpdatePromptAssetDto
    ) {
        const projectId = req.projectId;
        return this.service.update(key, updateDto, projectId);
    }

    @Delete(':assetKey')
    @ApiOperation({ summary: 'Elimina un prompt asset (y sus versiones/traducciones por Cascade) dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'assetKey', description: 'Key única del asset a eliminar' })
    @ApiResponse({ status: 200, description: 'Asset eliminado.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Asset no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto al eliminar (revisar relaciones sin Cascade).' })
    @HttpCode(HttpStatus.OK)
    remove(@Req() req: RequestWithProject, @Param('assetKey') key: string) {
        const projectId = req.projectId;
        return this.service.remove(key, projectId);
    }
}
