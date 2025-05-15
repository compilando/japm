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
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Inject,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EnvironmentService } from './environment.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Environment } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { Logger } from '@nestjs/common';

// Define interface for request with projectId
interface RequestWithProject extends ExpressRequest {
  projectId: string;
}

@ApiTags('Environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/environments')
export class EnvironmentController {
  private readonly logger = new Logger(EnvironmentController.name);

  constructor(
    private readonly service: EnvironmentService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Helper function to get the cache key for the findAll endpoint
  private getFindAllCacheKey(projectId: string): string {
    return `/api/projects/${projectId}/environments`;
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Creates a new environment for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiBody({ type: CreateEnvironmentDto })
  @ApiResponse({
    status: 201,
    description: 'Environment created.',
    type: CreateEnvironmentDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict, an environment with this name already exists in the project.',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: RequestWithProject,
    @Body() createDto: CreateEnvironmentDto,
  ): Promise<Environment> {
    const projectId = req.projectId;
    this.logger.log(
      `[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createDto, null, 2)}`,
    );
    const newEnvironment = await this.service.create(createDto, projectId);
    // Invalidate cache
    const cacheKey = this.getFindAllCacheKey(projectId);
    await this.cacheManager.del(cacheKey);
    console.log(`Cache invalidated for key: ${cacheKey}`);
    return newEnvironment;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Gets all environments for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'List of environments.',
    type: [CreateEnvironmentDto],
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findAll(@Req() req: RequestWithProject): Promise<Environment[]> {
    const projectId = req.projectId;
    // console.log(`Cache MISS: EnvironmentController.findAll(${projectId}) executed`);
    return this.service.findAll(projectId);
  }

  @Get(':environmentId')
  @ApiOperation({ summary: 'Gets an environment by its ID within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'environmentId',
    description: 'Unique environment ID (CUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Environment found.',
    type: CreateEnvironmentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project or Environment not found.',
  })
  findOne(
    @Req() req: RequestWithProject,
    @Param('environmentId') environmentId: string,
  ): Promise<Environment> {
    const projectId = req.projectId;
    return this.service.findOne(environmentId, projectId);
  }

  @Get('/by-name/:name')
  @ApiOperation({ summary: 'Gets an environment by its name within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'name',
    description: 'Unique environment name in the project',
  })
  @ApiResponse({
    status: 200,
    description: 'Environment found.',
    type: CreateEnvironmentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project or Environment not found.',
  })
  findByName(
    @Req() req: RequestWithProject,
    @Param('name') name: string,
  ): Promise<Environment> {
    const projectId = req.projectId;
    return this.service.findByName(name, projectId);
  }

  @Patch(':environmentId')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({ summary: 'Updates an existing environment in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'environmentId',
    description: 'Unique ID of the environment to update (CUID)',
    type: String,
  })
  @ApiBody({ type: UpdateEnvironmentDto })
  @ApiResponse({
    status: 200,
    description: 'Environment updated.',
    type: CreateEnvironmentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project or Environment not found.',
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict, an environment with the new name already exists in the project.',
  })
  async update(
    @Req() req: RequestWithProject,
    @Param('environmentId') environmentId: string,
    @Body() updateDto: UpdateEnvironmentDto,
  ): Promise<Environment> {
    const projectId = req.projectId;
    this.logger.log(
      `[update] Received PATCH for projectId: ${projectId}, environmentId: ${environmentId}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    );
    const updatedEnvironment = await this.service.update(
      environmentId,
      updateDto,
      projectId,
    );
    // Invalidate cache
    const cacheKey = this.getFindAllCacheKey(projectId);
    await this.cacheManager.del(cacheKey);
    console.log(`Cache invalidated for key: ${cacheKey}`);
    // Optionally invalidate findOne cache: `/api/projects/${projectId}/environments/${environmentId}`
    // Optionally invalidate findByName cache: `/api/projects/${projectId}/environments/by-name/${updatedEnvironment.name}` (and potentially old name)
    return updatedEnvironment;
  }

  @Delete(':environmentId')
  @ApiOperation({ summary: 'Deletes an environment from a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'environmentId',
    description: 'Unique ID of the environment to delete (CUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Environment deleted.',
    type: CreateEnvironmentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project or Environment not found.',
  })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: RequestWithProject,
    @Param('environmentId') environmentId: string,
  ): Promise<Environment> {
    const projectId = req.projectId;
    // Consider getting the environment name before deleting if needed for findByName cache invalidation
    const removedEnvironment = await this.service.remove(
      environmentId,
      projectId,
    );
    // Invalidate cache
    const cacheKey = this.getFindAllCacheKey(projectId);
    await this.cacheManager.del(cacheKey);
    console.log(`Cache invalidated for key: ${cacheKey}`);
    // Optionally invalidate findOne/findByName caches
    return removedEnvironment;
  }
}
