import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Tag } from '@prisma/client'; // Usar el tipo Prisma directamente para la respuesta

@ApiTags('Tag')
@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crear un nuevo tag' })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, description: 'Tag creado.', type: CreateTagDto }) // Podríamos crear un TagResponseDto si fuera necesario
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 409, description: 'Conflicto, el tag ya existe (por nombre).' })
  create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los tags' })
  @ApiResponse({ status: 200, description: 'Lista de tags.', type: [CreateTagDto] })
  findAll(): Promise<Tag[]> {
    return this.tagService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tag por su ID (CUID)' })
  @ApiParam({ name: 'id', description: 'ID del tag', type: String })
  @ApiResponse({ status: 200, description: 'Tag encontrado.', type: CreateTagDto })
  @ApiResponse({ status: 404, description: 'Tag no encontrado.' })
  findOne(@Param('id') id: string): Promise<Tag> {
    return this.tagService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualizar un tag por su ID' })
  @ApiParam({ name: 'id', description: 'ID del tag a actualizar', type: String })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Tag actualizado.', type: CreateTagDto })
  @ApiResponse({ status: 404, description: 'Tag no encontrado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 409, description: 'Conflicto, el nombre del tag ya existe.' })
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto): Promise<Tag> {
    return this.tagService.update(id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un tag por su ID' })
  @ApiParam({ name: 'id', description: 'ID del tag a eliminar', type: String })
  @ApiResponse({ status: 200, description: 'Tag eliminado.' })
  @ApiResponse({ status: 404, description: 'Tag no encontrado.' })
  remove(@Param('id') id: string): Promise<Tag> {
    return this.tagService.remove(id);
  }
}
