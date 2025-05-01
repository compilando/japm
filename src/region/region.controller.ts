import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Region } from '@prisma/client';

@ApiTags('regions')
@Controller('regions') // Ruta base /regions
export class RegionController {
    constructor(private readonly regionService: RegionService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear una nueva región (identificada por languageCode)' })
    @ApiBody({ type: CreateRegionDto })
    @ApiResponse({ status: 201, description: 'Región creada exitosamente.', type: CreateRegionDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Región padre no encontrada.' })
    @ApiResponse({ status: 409, description: 'languageCode ya existe.' })
    create(@Body() createRegionDto: CreateRegionDto): Promise<Region> {
        return this.regionService.create(createRegionDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todas las regiones' })
    @ApiResponse({ status: 200, description: 'Lista de regiones.', type: [CreateRegionDto] })
    findAll(): Promise<Region[]> {
        return this.regionService.findAll();
    }

    @Get(':languageCode')
    @ApiOperation({ summary: 'Obtener una región por languageCode' })
    @ApiParam({ name: 'languageCode', description: 'Código de idioma (ID) de la región', type: String, example: 'es-ES' })
    @ApiResponse({ status: 200, description: 'Región encontrada.', type: CreateRegionDto })
    @ApiResponse({ status: 404, description: 'Región no encontrada.' })
    findOne(@Param('languageCode') languageCode: string): Promise<Region> {
        return this.regionService.findOne(languageCode);
    }

    @Patch(':languageCode')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar una región por languageCode' })
    @ApiParam({ name: 'languageCode', description: 'Código de idioma (ID) de la región a actualizar', type: String, example: 'es-ES' })
    @ApiBody({ type: UpdateRegionDto })
    @ApiResponse({ status: 200, description: 'Región actualizada exitosamente.', type: CreateRegionDto })
    @ApiResponse({ status: 404, description: 'Región o región padre no encontrada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos (languageCode no se puede cambiar).' })
    update(@Param('languageCode') languageCode: string, @Body() updateRegionDto: UpdateRegionDto): Promise<Region> {
        return this.regionService.update(languageCode, updateRegionDto);
    }

    @Delete(':languageCode')
    @ApiOperation({ summary: 'Eliminar una región (y su CulturalData asociado) por languageCode' })
    @ApiParam({ name: 'languageCode', description: 'Código de idioma (ID) de la región a eliminar', type: String, example: 'es-ES' })
    @ApiResponse({ status: 200, description: 'Región eliminada exitosamente.' })
    @ApiResponse({ status: 404, description: 'Región no encontrada.' })
    remove(@Param('languageCode') languageCode: string): Promise<Region> {
        return this.regionService.remove(languageCode);
    }
}
