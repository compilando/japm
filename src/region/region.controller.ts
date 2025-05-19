import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
  UseInterceptors,
  Inject,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  CacheInterceptor,
  CacheKey,
  CacheTTL,
  CACHE_MANAGER,
} from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Region } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { Logger } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RegionDto } from './dto/region.dto';

// Extend Express Request interface to include projectId attached by the guard
interface RequestWithProject extends ExpressRequest {
  projectId: string;
}

@ApiTags('Regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/regions')
export class RegionController {
  private readonly logger = new Logger(RegionController.name);

  constructor(
    private readonly regionService: RegionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private getFindAllCacheKey(projectId: string): string {
    return `/api/projects/${projectId}/regions`;
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Create new region',
    description: 'Creates a new region for the current tenant. Accessible by global admins or tenant admins.'
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: String,
    required: true
  })
  @ApiBody({ type: CreateRegionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Region successfully created',
    type: RegionDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Region already exists - A region with this language code already exists for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to create regions'
  })
  async create(
    @Req() req: RequestWithProject,
    @Body() createRegionDto: CreateRegionDto,
  ): Promise<RegionDto> {
    const projectId = req.projectId;
    this.logger.debug(
      `[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createRegionDto, null, 2)}`,
    );
    const newRegion = await this.regionService.create(
      createRegionDto,
      projectId,
    );
    const cacheKey = this.getFindAllCacheKey(projectId);
    await this.cacheManager.del(cacheKey);
    console.log(`Cache invalidated for key: ${cacheKey}`);
    return newRegion as RegionDto;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get all regions',
    description: 'Retrieves a list of all regions for the current tenant. Results are cached for 1 hour.'
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: String,
    required: true
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of regions retrieved successfully',
    type: [RegionDto]
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found'
  })
  findAll(@Req() req: RequestWithProject): Promise<RegionDto[]> {
    const projectId = req.projectId;
    return this.regionService.findAll(projectId) as Promise<RegionDto[]>;
  }

  @Get(':langCode')
  @ApiOperation({
    summary: 'Get region by language code',
    description: 'Retrieves a specific region by its language code (e.g., en-US, es-ES). Results are cached for 1 hour.'
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: String,
    required: true
  })
  @ApiParam({
    name: 'langCode',
    type: 'string',
    description: 'Language code of the region (e.g., en-US, es-ES)',
    required: true
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Region found successfully',
    type: RegionDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Region not found - The specified language code does not exist for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @CacheKey('region')
  @CacheTTL(3600)
  findOne(
    @Req() req: RequestWithProject,
    @Param('langCode') langCode: string,
  ): Promise<RegionDto> {
    const projectId = req.projectId;
    return this.regionService.findOne(langCode, projectId) as Promise<RegionDto>;
  }

  @Patch(':langCode')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({
    summary: 'Update region',
    description: 'Updates an existing region\'s information. Accessible by global admins or tenant admins.'
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: String,
    required: true
  })
  @ApiParam({
    name: 'langCode',
    type: 'string',
    description: 'Language code of the region to update (e.g., en-US, es-ES)',
    required: true
  })
  @ApiBody({ type: UpdateRegionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Region updated successfully',
    type: RegionDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Region not found - The specified language code does not exist for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to update regions'
  })
  async update(
    @Req() req: RequestWithProject,
    @Param('langCode') langCode: string,
    @Body() updateRegionDto: UpdateRegionDto,
  ): Promise<RegionDto> {
    const projectId = req.projectId;
    this.logger.debug(
      `[update] Received PATCH for projectId: ${projectId}, langCode: ${langCode}. Body: ${JSON.stringify(updateRegionDto, null, 2)}`,
    );
    const updatedRegion = await this.regionService.update(
      langCode,
      updateRegionDto,
      projectId,
    );
    const cacheKey = this.getFindAllCacheKey(projectId);
    await this.cacheManager.del(cacheKey);
    console.log(`Cache invalidated for key: ${cacheKey}`);
    return updatedRegion as RegionDto;
  }

  @Delete(':langCode')
  @ApiOperation({
    summary: 'Delete region',
    description: 'Permanently deletes a region. This is a destructive operation that requires admin privileges.'
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: String,
    required: true
  })
  @ApiParam({
    name: 'langCode',
    type: 'string',
    description: 'Language code of the region to delete (e.g., en-US, es-ES)',
    required: true
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Region successfully deleted'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Region not found - The specified language code does not exist for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to delete regions'
  })
  async remove(
    @Req() req: RequestWithProject,
    @Param('langCode') langCode: string,
  ): Promise<void> {
    const projectId = req.projectId;
    await this.regionService.remove(langCode, projectId);
    const cacheKey = this.getFindAllCacheKey(projectId);
    await this.cacheManager.del(cacheKey);
    console.log(`Cache invalidated for key: ${cacheKey}`);
  }
}
