import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TacticService } from './tactic.service';
import { CreateTacticDto } from './dto/create-tactic.dto';
import { UpdateTacticDto } from './dto/update-tactic.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { Tactic, Region, CulturalData } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto'; // Para el DTO de respuesta
import { CreateCulturalDataDto } from '../cultural-data/dto/create-cultural-data.dto'; // Para el DTO de respuesta

// DTO de respuesta
class TacticResponse extends CreateTacticDto {
    @ApiProperty({ type: () => CreateRegionDto, required: false })
    region?: Region;
    @ApiProperty({ type: () => CreateCulturalDataDto, required: false })
    culturalData?: CulturalData;
    // prompts: Prompt[]; // Podríamos añadir los prompts también
}

@ApiTags('Tactics')
@Controller('tactics')
export class TacticController {
    constructor(private readonly service: TacticService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea una nueva táctica conversacional' })
    @ApiBody({ type: CreateTacticDto })
    @ApiResponse({ status: 201, description: 'Táctica creada.', type: CreateTacticDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Región o CulturalData no encontrada.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe una táctica con ese nombre.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createDto: CreateTacticDto): Promise<Tactic> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todas las tácticas conversacionales' })
    @ApiResponse({ status: 200, description: 'Lista de tácticas.', type: [CreateTacticDto] })
    findAll(): Promise<Tactic[]> {
        return this.service.findAll();
    }

    @Get(':name')
    @ApiOperation({ summary: 'Obtiene una táctica por su nombre (ID)' })
    @ApiParam({ name: 'name', description: 'Nombre único de la táctica' })
    @ApiResponse({ status: 200, description: 'Táctica encontrada.', type: CreateTacticDto })
    @ApiResponse({ status: 404, description: 'Táctica no encontrada.' })
    findOne(@Param('name') name: string): Promise<Tactic> {
        return this.service.findOne(name);
    }

    @Patch(':name')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualiza una táctica existente' })
    @ApiParam({ name: 'name', description: 'Nombre único de la táctica a actualizar' })
    @ApiBody({ type: UpdateTacticDto })
    @ApiResponse({ status: 200, description: 'Táctica actualizada.', type: CreateTacticDto })
    @ApiResponse({ status: 404, description: 'Táctica, Región o CulturalData no encontrada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('name') name: string, @Body() updateDto: UpdateTacticDto): Promise<Tactic> {
        return this.service.update(name, updateDto);
    }

    @Delete(':name')
    @ApiOperation({ summary: 'Elimina una táctica' })
    @ApiParam({ name: 'name', description: 'Nombre único de la táctica a eliminar' })
    @ApiResponse({ status: 200, description: 'Táctica eliminada.' })
    @ApiResponse({ status: 404, description: 'Táctica no encontrada.' })
    @HttpCode(HttpStatus.OK)
    remove(@Param('name') name: string): Promise<Tactic> {
        return this.service.remove(name);
    }
}
