import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Project, Prisma } from '@prisma/client'; // Import Prisma
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Importar JwtAuthGuard
import { Logger } from '@nestjs/common'; // Import Logger

@ApiTags('Projects')
@Controller('projects')
export class ProjectController {
    private readonly logger = new Logger(ProjectController.name); // Add Logger instance

    constructor(private readonly projectService: ProjectService) { }

    @UseGuards(JwtAuthGuard)
    @Get('mine')
    @ApiOperation({ summary: 'Get projects accessible by the current user' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: 'List of user projects.', type: [CreateProjectDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    findMine(@Request() req): Promise<Pick<Project, 'id' | 'name'>[]> {
        const userId = req.user.userId;
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            this.logger.error('TenantId not found in authenticated user request for findMine');
            throw new UnauthorizedException('User tenant information is missing');
        }
        return this.projectService.findAllForUser(userId, tenantId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new project' })
    @ApiResponse({ status: 201, description: 'The project has been successfully created.', type: CreateProjectDto })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    create(@Request() req, @Body() createProjectDto: CreateProjectDto): Promise<Project> {
        this.logger.debug(`[create] Received POST request. Body: ${JSON.stringify(createProjectDto, null, 2)}`);
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            this.logger.error('User ID or Tenant ID not found in authenticated user request for project creation');
            throw new UnauthorizedException('User or tenant information is missing');
        }
        return this.projectService.create(createProjectDto, userId, tenantId);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get all projects for the authenticated user\'s tenant' })
    @ApiResponse({ status: 200, description: 'List of projects' /*, type: [ProjectDto] */ })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    findAll(@Request() req): Promise<Pick<Project, 'id' | 'name' | 'description' | 'tenantId'>[]> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            this.logger.error('TenantId not found in authenticated user request');
            throw new UnauthorizedException('User tenant information is missing');
        }
        this.logger.debug(`[findAll] Fetching projects for tenantId: ${tenantId}`);
        return this.projectService.findAll(tenantId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a project by ID' })
    @ApiParam({ name: 'id', description: 'Project CUID', type: String })
    @ApiResponse({ status: 200, description: 'The found project record', type: CreateProjectDto })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    findOne(@Param('id') id: string, @Request() req): Promise<Project> {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            this.logger.error('TenantId not found in authenticated user request for findOne');
            throw new UnauthorizedException('User tenant information is missing');
        }
        return this.projectService.findOne(id, tenantId);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a project by ID' })
    @ApiParam({ name: 'id', description: 'Project CUID', type: String })
    @ApiResponse({ status: 200, description: 'The project has been successfully updated.', type: CreateProjectDto })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req): Promise<Project> {
        this.logger.debug(`[update] Received PATCH for projectId: ${id}. Body: ${JSON.stringify(updateProjectDto, null, 2)}`);
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            this.logger.error('TenantId not found in authenticated user request for update');
            throw new UnauthorizedException('User tenant information is missing');
        }
        return this.projectService.update(id, updateProjectDto, tenantId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a project by ID' })
    @ApiParam({ name: 'id', description: 'Project CUID', type: String })
    @ApiResponse({ status: 200, description: 'The project has been successfully deleted.', type: CreateProjectDto })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    remove(@Param('id') id: string, @Request() req): Promise<Project> {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            this.logger.error('TenantId not found in authenticated user request for remove');
            throw new UnauthorizedException('User tenant information is missing');
        }
        return this.projectService.remove(id, tenantId);
    }
} 