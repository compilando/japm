import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Tag } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { Request as ExpressRequest } from 'express';

// Definir interfaz para el request con projectId
interface RequestWithProject extends ExpressRequest {
  projectId: string;
}

// Devolveremos la entidad Tag completa en las respuestas.

@ApiTags('Tags')
@UseGuards(ProjectGuard)
@Controller('/api/projects/:projectId/tags')
export class TagController {
  constructor(private readonly service: TagService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Crea una nueva etiqueta para un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, description: 'Etiqueta creada.', type: CreateTagDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una etiqueta con ese nombre en el proyecto.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: RequestWithProject, @Body() createDto: CreateTagDto): Promise<Tag> {
    const projectId = req.projectId;
    return this.service.create(createDto, projectId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtiene todas las etiquetas de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiResponse({ status: 200, description: 'Lista de etiquetas.', type: [CreateTagDto] })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
  findAll(@Req() req: RequestWithProject): Promise<Tag[]> {
    const projectId = req.projectId;
    return this.service.findAll(projectId);
  }

  @Get(':tagId')
  @ApiOperation({ summary: 'Obtiene una etiqueta por su ID dentro de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({ name: 'tagId', description: 'ID único de la etiqueta (CUID)', type: String })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada.', type: CreateTagDto })
  @ApiResponse({ status: 404, description: 'Proyecto o Etiqueta no encontrada.' })
  findOne(@Req() req: RequestWithProject, @Param('tagId') tagId: string): Promise<Tag> {
    const projectId = req.projectId;
    return this.service.findOne(tagId, projectId);
  }

  @Get('/by-name/:name')
  @ApiOperation({ summary: 'Obtiene una etiqueta por su nombre dentro de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({ name: 'name', description: 'Nombre único de la etiqueta en el proyecto' })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada.', type: CreateTagDto })
  @ApiResponse({ status: 404, description: 'Proyecto o Etiqueta no encontrada.' })
  findByName(@Req() req: RequestWithProject, @Param('name') name: string): Promise<Tag> {
    const projectId = req.projectId;
    return this.service.findByName(name, projectId);
  }

  @Patch(':tagId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
  @ApiOperation({ summary: 'Actualiza una etiqueta existente en un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({ name: 'tagId', description: 'ID único de la etiqueta a actualizar (CUID)', type: String })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Etiqueta actualizada.', type: CreateTagDto })
  @ApiResponse({ status: 404, description: 'Proyecto o Etiqueta no encontrada.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 409, description: 'Conflicto, ya existe una etiqueta con el nuevo nombre en el proyecto.' })
  update(
    @Req() req: RequestWithProject,
    @Param('tagId') tagId: string,
    @Body() updateDto: UpdateTagDto
  ): Promise<Tag> {
    const projectId = req.projectId;
    return this.service.update(tagId, updateDto, projectId);
  }

  @Delete(':tagId')
  @ApiOperation({ summary: 'Elimina una etiqueta de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({ name: 'tagId', description: 'ID único de la etiqueta a eliminar (CUID)', type: String })
  @ApiResponse({ status: 200, description: 'Etiqueta eliminada.', type: CreateTagDto })
  @ApiResponse({ status: 404, description: 'Proyecto o Etiqueta no encontrada.' })
  @ApiResponse({ status: 409, description: 'Conflicto, la etiqueta está en uso.' })
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: RequestWithProject, @Param('tagId') tagId: string): Promise<Tag> {
    const projectId = req.projectId;
    return this.service.remove(tagId, projectId);
  }
}
