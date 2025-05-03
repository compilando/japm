import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Req, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Region } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

// Extend Express Request interface to include projectId attached by the guard
interface RequestWithProject extends ExpressRequest {
    projectId: string;
    // originalUrl?: string; // Removed - not compatible and not needed
}

@ApiTags('Regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('/api/projects/:projectId/regions')
export class RegionController {
    constructor(
        private readonly regionService: RegionService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache, // Inject CacheManager
    ) { }

    // Helper function to get the cache key for the findAll endpoint
    private getFindAllCacheKey(projectId: string): string {
        // Construct the key based on the controller route and projectId
        return `/api/projects/${projectId}/regions`;
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear una nueva región para un proyecto específico' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiBody({ type: CreateRegionDto })
    @ApiResponse({ status: 201, description: 'Región creada.', type: CreateRegionDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Región padre no encontrada.' })
    @ApiResponse({ status: 409, description: 'languageCode ya existe.' })
    async create(@Req() req: RequestWithProject, @Body() createRegionDto: CreateRegionDto): Promise<Region> {
        const projectId = req.projectId;
        const newRegion = await this.regionService.create(createRegionDto, projectId);
        // Invalidate cache after creating
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`); // Optional log
        return newRegion;
    }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Obtener todas las regiones para un proyecto específico' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de regiones.', type: [CreateRegionDto] })
    findAll(@Req() req: RequestWithProject): Promise<Region[]> {
        const projectId = req.projectId;
        // console.log(`Cache MISS: RegionController.findAll(${projectId}) executed`);
        return this.regionService.findAll(projectId);
    }

    @Get(':languageCode')
    @ApiOperation({ summary: 'Obtener una región específica dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'languageCode', description: 'Código de idioma (ID) de la región', type: String })
    @ApiResponse({ status: 200, description: 'Región encontrada.', type: CreateRegionDto })
    @ApiResponse({ status: 404, description: 'Proyecto o Región no encontrada.' })
    findOne(@Req() req: RequestWithProject, @Param('languageCode') languageCode: string): Promise<Region> {
        const projectId = req.projectId;
        return this.regionService.findOne(languageCode, projectId);
    }

    @Patch(':languageCode')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar una región específica dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'languageCode', description: 'Código de idioma (ID) de la región a actualizar', type: String })
    @ApiBody({ type: UpdateRegionDto })
    @ApiResponse({ status: 200, description: 'Región actualizada.', type: CreateRegionDto })
    @ApiResponse({ status: 404, description: 'Proyecto o Región no encontrada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos (languageCode no se puede cambiar).' })
    async update(
        @Req() req: RequestWithProject,
        @Param('languageCode') languageCode: string,
        @Body() updateRegionDto: UpdateRegionDto
    ): Promise<Region> {
        const projectId = req.projectId;
        const updatedRegion = await this.regionService.update(languageCode, updateRegionDto, projectId);
        // Invalidate cache after updating
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`); // Optional log
        // Potentially invalidate findOne cache key too: `/api/projects/${projectId}/regions/${languageCode}`
        return updatedRegion;
    }

    @Delete(':languageCode')
    @ApiOperation({ summary: 'Eliminar una región específica dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'languageCode', description: 'Código de idioma (ID) de la región a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Región eliminada.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Región no encontrada.' })
    async remove(@Req() req: RequestWithProject, @Param('languageCode') languageCode: string): Promise<Region> {
        const projectId = req.projectId;
        const removedRegion = await this.regionService.remove(languageCode, projectId);
        // Invalidate cache after removing
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`); // Optional log
        // Potentially invalidate findOne cache key too: `/api/projects/${projectId}/regions/${languageCode}`
        return removedRegion;
    }
}
