import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Req, UseGuards } from '@nestjs/common';
import { CulturalDataService } from './cultural-data.service';
import { CreateCulturalDataDto } from './dto/create-cultural-data.dto';
import { UpdateCulturalDataDto } from './dto/update-cultural-data.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty, ApiBearerAuth } from '@nestjs/swagger';
import { CulturalData, Region } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

// Define interface for request with projectId
interface RequestWithProject extends ExpressRequest {
    projectId: string;
}

// Definir un DTO de respuesta que incluya la región (opcional)
class CulturalDataResponse extends CreateCulturalDataDto {
    @ApiProperty({ type: () => CreateRegionDto })
    region?: Region; // Region es opcional si se permite desconectar

    // Añadir projectId si se quiere mostrar en la respuesta
    @ApiProperty()
    projectId: string;
}

@ApiTags('Cultural Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('/api/projects/:projectId/cultural-data')
export class CulturalDataController {
    constructor(private readonly culturalDataService: CulturalDataService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear nuevos datos culturales dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiBody({ type: CreateCulturalDataDto })
    @ApiResponse({ status: 201, description: 'Datos culturales creados.', type: CulturalDataResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Región referenciada no encontrada.' })
    create(@Req() req: RequestWithProject, @Body() createDto: CreateCulturalDataDto): Promise<CulturalData> {
        const projectId = req.projectId;
        return this.culturalDataService.create(createDto, projectId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los datos culturales de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de datos culturales.', type: [CulturalDataResponse] })
    @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
    findAll(@Req() req: RequestWithProject): Promise<CulturalData[]> {
        const projectId = req.projectId;
        return this.culturalDataService.findAll(projectId);
    }

    @Get(':culturalDataId')
    @ApiOperation({ summary: 'Obtener datos culturales por ID dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'culturalDataId', description: 'ID de los datos culturales', type: String })
    @ApiResponse({ status: 200, description: 'Datos culturales encontrados.', type: CulturalDataResponse })
    @ApiResponse({ status: 404, description: 'Proyecto o Datos culturales no encontrados.' })
    findOne(@Req() req: RequestWithProject, @Param('culturalDataId') id: string): Promise<CulturalData> {
        const projectId = req.projectId;
        return this.culturalDataService.findOne(id, projectId);
    }

    @Patch(':culturalDataId')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar datos culturales por ID dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'culturalDataId', description: 'ID a actualizar', type: String })
    @ApiBody({ type: UpdateCulturalDataDto })
    @ApiResponse({ status: 200, description: 'Datos culturales actualizados.', type: CulturalDataResponse })
    @ApiResponse({ status: 404, description: 'Proyecto o Datos culturales no encontrados.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Req() req: RequestWithProject, @Param('culturalDataId') id: string, @Body() updateDto: UpdateCulturalDataDto): Promise<CulturalData> {
        const projectId = req.projectId;
        return this.culturalDataService.update(id, updateDto, projectId);
    }

    @Delete(':culturalDataId')
    @ApiOperation({ summary: 'Eliminar datos culturales por ID dentro de un proyecto' })
    @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
    @ApiParam({ name: 'culturalDataId', description: 'ID a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Datos culturales eliminados.' })
    @ApiResponse({ status: 404, description: 'Proyecto o Datos culturales no encontrados.' })
    @ApiResponse({ status: 409, description: 'Conflicto al eliminar (referenciado por otras entidades).' })
    remove(@Req() req: RequestWithProject, @Param('culturalDataId') id: string): Promise<CulturalData> {
        const projectId = req.projectId;
        return this.culturalDataService.remove(id, projectId);
    }
}
