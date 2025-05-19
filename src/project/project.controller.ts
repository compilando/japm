import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Request,
  UnauthorizedException,
  HttpStatus,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Project, Prisma } from '@prisma/client'; // Import Prisma
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Importar JwtAuthGuard
import { Logger } from '@nestjs/common'; // Import Logger
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ProjectDto } from './dto/project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name); // Add Logger instance

  constructor(private readonly projectService: ProjectService) { }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  @ApiOperation({
    summary: 'Obtener proyectos del usuario actual',
    description: 'Retorna todos los proyectos a los que tiene acceso el usuario autenticado'
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de proyectos del usuario',
    type: [CreateProjectDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o expirado'
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Información de tenant no disponible'
  })
  findMine(@Request() req): Promise<Pick<Project, 'id' | 'name'>[]> {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      this.logger.error(
        'TenantId not found in authenticated user request for findMine',
      );
      throw new UnauthorizedException('User tenant information is missing');
    }
    return this.projectService.findAllForUser(userId, tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Create new project',
    description: 'Creates a new project for the current tenant. Accessible by global admins or tenant admins.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project successfully created',
    type: ProjectDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Project already exists - A project with this name already exists for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to create projects'
  })
  create(@Body() createProjectDto: CreateProjectDto, @Req() req: any): Promise<ProjectDto> {
    this.logger.debug(
      `[create] Received POST request. Body: ${JSON.stringify(createProjectDto, null, 2)}`,
    );
    const userId = req.user?.userId;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId) {
      this.logger.error(
        'User ID or Tenant ID not found in authenticated user request for project creation',
      );
      throw new UnauthorizedException('User or tenant information is missing');
    }
    return this.projectService.create(createProjectDto, userId, tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all projects',
    description: 'Retrieves a list of all projects for the current tenant. Results are cached for 1 hour.'
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of projects retrieved successfully',
    type: [ProjectDto]
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @CacheKey('projects')
  @CacheTTL(3600)
  findAll(@Req() req: any): Promise<ProjectDto[]> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      this.logger.error('TenantId not found in authenticated user request');
      throw new UnauthorizedException('User tenant information is missing');
    }
    this.logger.debug(`[findAll] Fetching projects for tenantId: ${tenantId}`);
    return this.projectService.findAll(tenantId).then(projects =>
      projects.map(project => ({
        ...project,
        ownerUserId: project.ownerUserId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get project by ID',
    description: 'Retrieves a specific project by its unique ID. Results are cached for 1 hour.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project found successfully',
    type: ProjectDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found - The specified ID does not exist for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique project identifier (UUID)',
    required: true
  })
  @CacheKey('project')
  @CacheTTL(3600)
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ProjectDto> {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      this.logger.error(
        'TenantId not found in authenticated user request for findOne',
      );
      throw new UnauthorizedException('User tenant information is missing');
    }
    return this.projectService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update project',
    description: 'Updates an existing project\'s information. Accessible by global admins or tenant admins.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project updated successfully',
    type: ProjectDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found - The specified ID does not exist for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Project name already exists - The provided name is already in use'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to update projects'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique project identifier to update (UUID)',
    required: true
  })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() req: any,
  ): Promise<ProjectDto> {
    this.logger.debug(
      `[update] Received PATCH for projectId: ${id}. Body: ${JSON.stringify(updateProjectDto, null, 2)}`,
    );
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      this.logger.error(
        'TenantId not found in authenticated user request for update',
      );
      throw new UnauthorizedException('User tenant information is missing');
    }
    return this.projectService.update(id, updateProjectDto, tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project',
    description: 'Permanently deletes a project. This is a destructive operation that requires admin privileges.'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Project successfully deleted'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found - The specified ID does not exist for this tenant'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to delete projects'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique project identifier to delete (UUID)',
    required: true
  })
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<void> {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      this.logger.error(
        'TenantId not found in authenticated user request for remove',
      );
      throw new UnauthorizedException('User tenant information is missing');
    }
    await this.projectService.remove(id, tenantId);
  }
}
