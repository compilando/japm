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
import { Logger } from '@nestjs/common';

// Extend Express Request interface to include projectId attached by the guard
interface RequestWithProject extends ExpressRequest {
    projectId: string;
    // originalUrl?: string; // Removed - not compatible and not needed
}

@ApiTags('Regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/regions')
export class RegionController {
    private readonly logger = new Logger(RegionController.name);

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
    @ApiOperation({ summary: 'Creates a new region for a specific project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiBody({ type: CreateRegionDto })
    @ApiResponse({ status: 201, description: 'Region created.', type: CreateRegionDto })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 404, description: 'Parent region not found.' })
    @ApiResponse({ status: 409, description: 'languageCode already exists.' })
    async create(@Req() req: RequestWithProject, @Body() createRegionDto: CreateRegionDto): Promise<Region> {
        const projectId = req.projectId;
        this.logger.debug(`[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createRegionDto, null, 2)}`);
        const newRegion = await this.regionService.create(createRegionDto, projectId);
        // Invalidate cache after creating
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`); // Optional log
        return newRegion;
    }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Gets all regions for a specific project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiResponse({ status: 200, description: 'List of regions.', type: [CreateRegionDto] })
    findAll(@Req() req: RequestWithProject): Promise<Region[]> {
        const projectId = req.projectId;
        // console.log(`Cache MISS: RegionController.findAll(${projectId}) executed`);
        return this.regionService.findAll(projectId);
    }

    @Get(':languageCode')
    @ApiOperation({ summary: 'Gets a specific region within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'languageCode', description: 'Language code (ID) of the region', type: String, required: true })
    @ApiResponse({ status: 200, description: 'Region found.', type: CreateRegionDto })
    @ApiResponse({ status: 404, description: 'Project or Region not found.' })
    findOne(@Req() req: RequestWithProject, @Param('languageCode') languageCode: string): Promise<Region> {
        const projectId = req.projectId;
        return this.regionService.findOne(languageCode, projectId);
    }

    @Patch(':languageCode')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Updates a specific region within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'languageCode', description: 'Language code (ID) of the region to update', type: String, required: true })
    @ApiBody({ type: UpdateRegionDto })
    @ApiResponse({ status: 200, description: 'Region updated.', type: CreateRegionDto })
    @ApiResponse({ status: 404, description: 'Project or Region not found.' })
    @ApiResponse({ status: 400, description: 'Invalid data (languageCode cannot be changed).' })
    async update(
        @Req() req: RequestWithProject,
        @Param('languageCode') languageCode: string,
        @Body() updateRegionDto: UpdateRegionDto
    ): Promise<Region> {
        const projectId = req.projectId;
        this.logger.debug(`[update] Received PATCH for projectId: ${projectId}, languageCode: ${languageCode}. Body: ${JSON.stringify(updateRegionDto, null, 2)}`);
        const updatedRegion = await this.regionService.update(languageCode, updateRegionDto, projectId);
        // Invalidate cache after updating
        const cacheKey = this.getFindAllCacheKey(projectId);
        await this.cacheManager.del(cacheKey);
        console.log(`Cache invalidated for key: ${cacheKey}`); // Optional log
        // Potentially invalidate findOne cache key too: `/api/projects/${projectId}/regions/${languageCode}`
        return updatedRegion;
    }

    @Delete(':languageCode')
    @ApiOperation({ summary: 'Deletes a specific region within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
    @ApiParam({ name: 'languageCode', description: 'Language code (ID) of the region to delete', type: String, required: true })
    @ApiResponse({ status: 200, description: 'Region deleted.' })
    @ApiResponse({ status: 404, description: 'Project or Region not found.' })
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
