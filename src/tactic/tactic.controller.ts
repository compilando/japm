import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { TacticService } from './tactic.service';
import { CreateTacticDto } from './dto/create-tactic.dto';
import { UpdateTacticDto } from './dto/update-tactic.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty, ApiBearerAuth } from '@nestjs/swagger';
import { Tactic, Region, CulturalData } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto'; // Para el DTO de respuesta
import { CreateCulturalDataDto } from '../cultural-data/dto/create-cultural-data.dto'; // Para el DTO de respuesta
import { ProjectGuard } from '../common/guards/project.guard'; // Import guard
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import JwtAuthGuard
import { Request as ExpressRequest } from 'express';

// Define interface for request with projectId
interface RequestWithProject extends ExpressRequest {
    projectId: string;
}

// DTO de respuesta (Independiente para evitar conflictos de herencia)
class TacticResponse {
    @ApiProperty()
    name: string;

    @ApiProperty({ required: false })
    tacticsConfig?: string;

    @ApiProperty({ type: () => CreateRegionDto, required: false })
    region?: Region;

    @ApiProperty({ type: () => CreateCulturalDataDto, required: false })
    culturalData?: CulturalData;

    @ApiProperty()
    projectId: string;

    // Se podrían añadir más campos si son relevantes en la respuesta
}

@ApiTags('Tactics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('/api/projects/:projectId/tactics') // Nueva ruta base
export class TacticController {
    constructor(private readonly service: TacticService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea una nueva táctica conversacional dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiBody({ type: CreateTacticDto })
    @ApiResponse({ status: 201, description: 'Táctica creada.', type: TacticResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Proyecto, Región o CulturalData no encontrada.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe una táctica con ese nombre en el proyecto.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: RequestWithProject, @Body() createDto: CreateTacticDto): Promise<Tactic> {
        const projectId = req.projectId;
        return this.service.create(createDto, projectId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todas las tácticas conversacionales de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de tácticas.', type: [TacticResponse] })
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    findAll(@Req() req: RequestWithProject): Promise<Tactic[]> {
        const projectId = req.projectId;
        return this.service.findAll(projectId);
    }

    @Get(':tacticName') // Usar nombre de parámetro más específico
    @ApiOperation({ summary: 'Obtiene una táctica por su nombre (ID) dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'tacticName', description: 'Nombre único de la táctica' })
    @ApiResponse({ status: 200, description: 'Táctica encontrada.', type: TacticResponse })
    @ApiResponse({ status: 404, description: 'Proyecto o Táctica no encontrada.' })
    findOne(@Req() req: RequestWithProject, @Param('tacticName') name: string): Promise<Tactic> {
        const projectId = req.projectId;
        return this.service.findOne(name, projectId);
    }

    @Patch(':tacticName')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualiza una táctica existente dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'tacticName', description: 'Nombre único de la táctica a actualizar' })
    @ApiBody({ type: UpdateTacticDto })
    @ApiResponse({ status: 200, description: 'Táctica actualizada.', type: TacticResponse })
    @ApiResponse({ status: 404, description: 'Proyecto, Táctica, Región o CulturalData no encontrada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Req() req: RequestWithProject, @Param('tacticName') name: string, @Body() updateDto: UpdateTacticDto): Promise<Tactic> {
        const projectId = req.projectId;
        return this.service.update(name, updateDto, projectId);
    }

    @Delete(':tacticName')
    @ApiOperation({ summary: 'Elimina una táctica dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'tacticName', description: 'Nombre único de la táctica a eliminar' })
    @ApiResponse({ status: 200, description: 'Táctica eliminada.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Táctica no encontrada.' })
    @ApiResponse({ status: 409, description: 'Conflicto al eliminar (referenciada por prompts).' })
    @HttpCode(HttpStatus.OK)
    remove(@Req() req: RequestWithProject, @Param('tacticName') name: string): Promise<Tactic> {
        const projectId = req.projectId;
        return this.service.remove(name, projectId);
    }
}
