import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RagDocumentMetadataService } from './rag-document-metadata.service';
import { CreateRagDocumentMetadataDto } from './dto/create-rag-document-metadata.dto';
import { UpdateRagDocumentMetadataDto } from './dto/update-rag-document-metadata.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiProperty,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RagDocumentMetadata, Region } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto'; // Para respuesta
import { ProjectGuard } from '../common/guards/project.guard'; // Import guard
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import JwtAuthGuard
import { Request as ExpressRequest } from 'express';
import { Logger } from '@nestjs/common'; // Import Logger

// Define interface for request with projectId
interface RequestWithProject extends ExpressRequest {
  projectId: string;
}

// DTO de respuesta
class RagDocumentMetadataResponse extends CreateRagDocumentMetadataDto {
  @ApiProperty({ type: () => CreateRegionDto, required: false })
  region?: Region;
  // Incluir ID (CUID) generado
  @ApiProperty()
  id: string;
  // Incluir projectId
  @ApiProperty()
  projectId: string;
}

@ApiTags('RAG Document Metadata')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/rag-document-metadata') // Nueva ruta base
export class RagDocumentMetadataController {
  private readonly logger = new Logger(RagDocumentMetadataController.name); // Add Logger instance

  constructor(private readonly service: RagDocumentMetadataService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Crear metadatos para un documento RAG dentro de un proyecto',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiBody({ type: CreateRagDocumentMetadataDto })
  @ApiResponse({
    status: 201,
    description: 'Metadatos creados.',
    type: RagDocumentMetadataResponse,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 404,
    description: 'Proyecto o Región referenciada no encontrada.',
  })
  create(
    @Req() req: RequestWithProject,
    @Body() createDto: CreateRagDocumentMetadataDto,
  ): Promise<RagDocumentMetadata> {
    const projectId = req.projectId;
    this.logger.debug(
      `[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createDto, null, 2)}`,
    ); // Log the received DTO
    return this.service.create(createDto, projectId);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los metadatos de documentos RAG de un proyecto',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista de metadatos.',
    type: [RagDocumentMetadataResponse],
  })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
  findAll(@Req() req: RequestWithProject): Promise<RagDocumentMetadata[]> {
    const projectId = req.projectId;
    return this.service.findAll(projectId);
  }

  @Get(':metadataId') // Usar un nombre de parámetro más específico
  @ApiOperation({ summary: 'Obtener metadatos por ID dentro de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({
    name: 'metadataId',
    description: 'ID de los metadatos (CUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Metadatos encontrados.',
    type: RagDocumentMetadataResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto o Metadatos no encontrados.',
  })
  findOne(
    @Req() req: RequestWithProject,
    @Param('metadataId') id: string,
  ): Promise<RagDocumentMetadata> {
    const projectId = req.projectId;
    return this.service.findOne(id, projectId);
  }

  @Patch(':metadataId')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({
    summary: 'Actualizar metadatos por ID dentro de un proyecto',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({
    name: 'metadataId',
    description: 'ID a actualizar',
    type: String,
  })
  @ApiBody({ type: UpdateRagDocumentMetadataDto })
  @ApiResponse({
    status: 200,
    description: 'Metadatos actualizados.',
    type: RagDocumentMetadataResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto, Metadatos o Región referenciada no encontrada.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(
    @Req() req: RequestWithProject,
    @Param('metadataId') id: string,
    @Body() updateDto: UpdateRagDocumentMetadataDto,
  ): Promise<RagDocumentMetadata> {
    const projectId = req.projectId;
    this.logger.debug(
      `[update] Received PATCH for projectId: ${projectId}, metadataId: ${id}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    ); // Log the received DTO
    return this.service.update(id, updateDto, projectId);
  }

  @Delete(':metadataId')
  @ApiOperation({ summary: 'Eliminar metadatos por ID dentro de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({ name: 'metadataId', description: 'ID a eliminar', type: String })
  @ApiResponse({ status: 200, description: 'Metadatos eliminados.' })
  @ApiResponse({
    status: 404,
    description: 'Proyecto o Metadatos no encontrados.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto al eliminar (referenciado por otras entidades).',
  })
  remove(
    @Req() req: RequestWithProject,
    @Param('metadataId') id: string,
  ): Promise<RagDocumentMetadata> {
    const projectId = req.projectId;
    return this.service.remove(id, projectId);
  }
}
