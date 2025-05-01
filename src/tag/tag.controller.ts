import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Tag } from '@prisma/client';

// Devolveremos la entidad Tag completa en las respuestas.

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly service: TagService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crea una nueva etiqueta' })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, description: 'Etiqueta creada.', type: CreateTagDto }) // Debería ser Tag
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una etiqueta con ese nombre.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateTagDto): Promise<Tag> {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtiene todas las etiquetas' })
  @ApiResponse({ status: 200, description: 'Lista de etiquetas.', type: [CreateTagDto] }) // Debería ser [Tag]
  findAll(): Promise<Tag[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una etiqueta por su ID' })
  @ApiParam({ name: 'id', description: 'ID único de la etiqueta (CUID)', type: String })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada.', type: CreateTagDto }) // Debería ser Tag
  @ApiResponse({ status: 404, description: 'Etiqueta no encontrada.' })
  findOne(@Param('id') id: string): Promise<Tag> {
    return this.service.findOne(id);
  }

  // Opcional: Endpoint para buscar por nombre
  @Get('/by-name/:name')
  @ApiOperation({ summary: 'Obtiene una etiqueta por su nombre' })
  @ApiParam({ name: 'name', description: 'Nombre único de la etiqueta' })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada.', type: CreateTagDto }) // Debería ser Tag
  @ApiResponse({ status: 404, description: 'Etiqueta no encontrada.' })
  findByName(@Param('name') name: string): Promise<Tag> {
    return this.service.findByName(name);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualiza una etiqueta existente' })
  @ApiParam({ name: 'id', description: 'ID único de la etiqueta a actualizar (CUID)', type: String })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Etiqueta actualizada.', type: CreateTagDto }) // Debería ser Tag
  @ApiResponse({ status: 404, description: 'Etiqueta no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una etiqueta con el nuevo nombre.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTagDto): Promise<Tag> {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una etiqueta' })
  @ApiParam({ name: 'id', description: 'ID único de la etiqueta a eliminar (CUID)', type: String })
  @ApiResponse({ status: 200, description: 'Etiqueta eliminada.', type: CreateTagDto }) // Debería ser Tag
  @ApiResponse({ status: 404, description: 'Etiqueta no encontrada.' })
  @ApiResponse({ status: 409, description: 'Conflicto, la etiqueta está en uso por prompts.' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<Tag> {
    return this.service.remove(id);
  }
}
