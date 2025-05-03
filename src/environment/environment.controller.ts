import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpCode, HttpStatus, Req, UseGuards, Inject, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EnvironmentService } from './environment.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Environment } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

// Definir interfaz para el request con projectId
interface RequestWithProject extends ExpressRequest {
    projectId: string;
}

@ApiTags('Environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('/api/projects/:projectId/environments')
export class EnvironmentController {
    constructor(
        private readonly service: EnvironmentService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    // Helper function to get the cache key for the findAll endpoint
    private getFindAllCacheKey(projectId: string): string {
        return `/api/projects/${projectId}/environments`;
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea un nuevo entorno para un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiBody({ type: CreateEnvironmentDto })
    @ApiResponse({ status: 201, description: 'Entorno creado.', type: CreateEnvironmentDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un entorno con ese nombre en el proyecto.' })
    @HttpCode(HttpStatus.CREATED)
    async create(@Req() req: RequestWithProject, @Body() createDto: CreateEnvironmentDto): Promise<Environment> {
        const projectId = req.projectId;
        const newEnvironment = await this.service.create(createDto, projectId);
        // Invalidate cache
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`);
        return newEnvironment;
    }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Obtiene todos los entornos de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de entornos.', type: [CreateEnvironmentDto] })
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    findAll(@Req() req: RequestWithProject): Promise<Environment[]> {
        const projectId = req.projectId;
        // console.log(`Cache MISS: EnvironmentController.findAll(${projectId}) executed`);
        return this.service.findAll(projectId);
    }

    @Get(':environmentId')
    @ApiOperation({ summary: 'Obtiene un entorno por su ID dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'environmentId', description: 'ID único del entorno (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Entorno encontrado.', type: CreateEnvironmentDto })
    @ApiResponse({ status: 404, description: 'Proyecto o Entorno no encontrado.' })
    findOne(@Req() req: RequestWithProject, @Param('environmentId') environmentId: string): Promise<Environment> {
        const projectId = req.projectId;
        return this.service.findOne(environmentId, projectId);
    }

    @Get('/by-name/:name')
    @ApiOperation({ summary: 'Obtiene un entorno por su nombre dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'name', description: 'Nombre único del entorno en el proyecto' })
    @ApiResponse({ status: 200, description: 'Entorno encontrado.', type: CreateEnvironmentDto })
    @ApiResponse({ status: 404, description: 'Proyecto o Entorno no encontrado.' })
    findByName(@Req() req: RequestWithProject, @Param('name') name: string): Promise<Environment> {
        const projectId = req.projectId;
        return this.service.findByName(name, projectId);
    }

    @Patch(':environmentId')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualiza un entorno existente en un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'environmentId', description: 'ID único del entorno a actualizar (CUID)', type: String })
    @ApiBody({ type: UpdateEnvironmentDto })
    @ApiResponse({ status: 200, description: 'Entorno actualizado.', type: CreateEnvironmentDto })
    @ApiResponse({ status: 404, description: 'Proyecto o Entorno no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un entorno con el nuevo nombre en el proyecto.' })
    async update(
        @Req() req: RequestWithProject,
        @Param('environmentId') environmentId: string,
        @Body() updateDto: UpdateEnvironmentDto
    ): Promise<Environment> {
        const projectId = req.projectId;
        const updatedEnvironment = await this.service.update(environmentId, updateDto, projectId);
        // Invalidate cache
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`);
        // Optionally invalidate findOne cache: `/api/projects/${projectId}/environments/${environmentId}`
        // Optionally invalidate findByName cache: `/api/projects/${projectId}/environments/by-name/${updatedEnvironment.name}` (and potentially old name)
        return updatedEnvironment;
    }

    @Delete(':environmentId')
    @ApiOperation({ summary: 'Elimina un entorno de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'environmentId', description: 'ID único del entorno a eliminar (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Entorno eliminado.', type: CreateEnvironmentDto })
    @ApiResponse({ status: 404, description: 'Proyecto o Entorno no encontrado.' })
    @HttpCode(HttpStatus.OK)
    async remove(@Req() req: RequestWithProject, @Param('environmentId') environmentId: string): Promise<Environment> {
        const projectId = req.projectId;
        // Consider getting the environment name before deleting if needed for findByName cache invalidation
        const removedEnvironment = await this.service.remove(environmentId, projectId);
        // Invalidate cache
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`);
        // Optionally invalidate findOne/findByName caches
        return removedEnvironment;
    }
} 