import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Environment } from '@prisma/client';

// Podríamos definir un DTO de respuesta si quisiéramos controlar qué se devuelve,
// pero por ahora devolveremos la entidad Environment completa.

@ApiTags('Environments')
@Controller('environments')
export class EnvironmentController {
    constructor(private readonly service: EnvironmentService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crea un nuevo entorno' })
    @ApiBody({ type: CreateEnvironmentDto })
    @ApiResponse({ status: 201, description: 'Entorno creado.', type: CreateEnvironmentDto }) // Debería ser Environment realmente
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un entorno con ese nombre.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createDto: CreateEnvironmentDto): Promise<Environment> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtiene todos los entornos' })
    @ApiResponse({ status: 200, description: 'Lista de entornos.', type: [CreateEnvironmentDto] }) // Debería ser [Environment]
    findAll(): Promise<Environment[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtiene un entorno por su ID' })
    @ApiParam({ name: 'id', description: 'ID único del entorno (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Entorno encontrado.', type: CreateEnvironmentDto }) // Debería ser Environment
    @ApiResponse({ status: 404, description: 'Entorno no encontrado.' })
    // NOTA: No usamos ParseUUIDPipe porque Prisma usa CUIDs (strings), no UUIDs estándar.
    // Se podría añadir validación custom si se quiere asegurar que es un CUID válido.
    findOne(@Param('id') id: string): Promise<Environment> {
        return this.service.findOne(id);
    }

    // Opcional: Endpoint para buscar por nombre si es común
    @Get('/by-name/:name')
    @ApiOperation({ summary: 'Obtiene un entorno por su nombre' })
    @ApiParam({ name: 'name', description: 'Nombre único del entorno' })
    @ApiResponse({ status: 200, description: 'Entorno encontrado.', type: CreateEnvironmentDto })
    @ApiResponse({ status: 404, description: 'Entorno no encontrado.' })
    findByName(@Param('name') name: string): Promise<Environment> {
        return this.service.findByName(name);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualiza un entorno existente' })
    @ApiParam({ name: 'id', description: 'ID único del entorno a actualizar (CUID)', type: String })
    @ApiBody({ type: UpdateEnvironmentDto })
    @ApiResponse({ status: 200, description: 'Entorno actualizado.', type: CreateEnvironmentDto }) // Debería ser Environment
    @ApiResponse({ status: 404, description: 'Entorno no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 409, description: 'Conflicto, ya existe un entorno con el nuevo nombre.' })
    update(@Param('id') id: string, @Body() updateDto: UpdateEnvironmentDto): Promise<Environment> {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Elimina un entorno' })
    @ApiParam({ name: 'id', description: 'ID único del entorno a eliminar (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Entorno eliminado.', type: CreateEnvironmentDto }) // Debería ser Environment
    @ApiResponse({ status: 404, description: 'Entorno no encontrado.' })
    @HttpCode(HttpStatus.OK) // Usar OK (200) o No Content (204) es común para DELETE
    remove(@Param('id') id: string): Promise<Environment> {
        return this.service.remove(id);
    }
} 