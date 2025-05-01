import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { CulturalDataService } from './cultural-data.service';
import { CreateCulturalDataDto } from './dto/create-cultural-data.dto';
import { UpdateCulturalDataDto } from './dto/update-cultural-data.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { CulturalData, Region } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto';

// Definir un DTO de respuesta que incluya la región
class CulturalDataResponse extends CreateCulturalDataDto {
    @ApiProperty({ type: () => CreateRegionDto })
    region: Region; // Usar el tipo Prisma Region
}

@ApiTags('cultural-data')
@Controller('cultural-data') // Ruta base /cultural-data
export class CulturalDataController {
    constructor(private readonly culturalDataService: CulturalDataService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear nuevos datos culturales' })
    @ApiBody({ type: CreateCulturalDataDto })
    @ApiResponse({ status: 201, description: 'Datos culturales creados.', type: CulturalDataResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    create(@Body() createCulturalDataDto: CreateCulturalDataDto): Promise<CulturalData> {
        return this.culturalDataService.create(createCulturalDataDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los datos culturales' })
    @ApiResponse({ status: 200, description: 'Lista de datos culturales.', type: [CulturalDataResponse] })
    findAll(): Promise<CulturalData[]> {
        return this.culturalDataService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener datos culturales por ID' })
    @ApiParam({ name: 'id', description: 'ID de los datos culturales', type: String })
    @ApiResponse({ status: 200, description: 'Datos culturales encontrados.', type: CulturalDataResponse })
    @ApiResponse({ status: 404, description: 'Datos culturales no encontrados.' })
    findOne(@Param('id') id: string): Promise<CulturalData> {
        return this.culturalDataService.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar datos culturales por ID' })
    @ApiParam({ name: 'id', description: 'ID a actualizar', type: String })
    @ApiBody({ type: UpdateCulturalDataDto })
    @ApiResponse({ status: 200, description: 'Datos culturales actualizados.', type: CulturalDataResponse })
    @ApiResponse({ status: 404, description: 'Datos culturales no encontrados.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateCulturalDataDto: UpdateCulturalDataDto): Promise<CulturalData> {
        return this.culturalDataService.update(id, updateCulturalDataDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar datos culturales por ID' })
    @ApiParam({ name: 'id', description: 'ID a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Datos culturales eliminados.' })
    @ApiResponse({ status: 404, description: 'Datos culturales no encontrados.' })
    remove(@Param('id') id: string): Promise<CulturalData> {
        return this.culturalDataService.remove(id);
    }
}
