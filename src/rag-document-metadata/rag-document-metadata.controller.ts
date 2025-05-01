import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { RagDocumentMetadataService } from './rag-document-metadata.service';
import { CreateRagDocumentMetadataDto } from './dto/create-rag-document-metadata.dto';
import { UpdateRagDocumentMetadataDto } from './dto/update-rag-document-metadata.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { RagDocumentMetadata, Region } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto'; // Para respuesta

// DTO de respuesta
class RagDocumentMetadataResponse extends CreateRagDocumentMetadataDto {
    @ApiProperty({ type: () => CreateRegionDto, required: false })
    region?: Region;
    // Incluir ID (CUID) generado
    @ApiProperty()
    id: string;
}

@ApiTags('RAG Document Metadata')
@Controller('rag-document-metadata')
export class RagDocumentMetadataController {
    constructor(private readonly service: RagDocumentMetadataService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear metadatos para un documento RAG' })
    @ApiBody({ type: CreateRagDocumentMetadataDto })
    @ApiResponse({ status: 201, description: 'Metadatos creados.', type: RagDocumentMetadataResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    @ApiResponse({ status: 404, description: 'Región referenciada no encontrada.' })
    create(@Body() createDto: CreateRagDocumentMetadataDto): Promise<RagDocumentMetadata> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los metadatos de documentos RAG' })
    @ApiResponse({ status: 200, description: 'Lista de metadatos.', type: [RagDocumentMetadataResponse] })
    findAll(): Promise<RagDocumentMetadata[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener metadatos por ID' })
    @ApiParam({ name: 'id', description: 'ID de los metadatos (CUID)', type: String })
    @ApiResponse({ status: 200, description: 'Metadatos encontrados.', type: RagDocumentMetadataResponse })
    @ApiResponse({ status: 404, description: 'Metadatos no encontrados.' })
    findOne(@Param('id') id: string): Promise<RagDocumentMetadata> {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar metadatos por ID' })
    @ApiParam({ name: 'id', description: 'ID a actualizar', type: String })
    @ApiBody({ type: UpdateRagDocumentMetadataDto })
    @ApiResponse({ status: 200, description: 'Metadatos actualizados.', type: RagDocumentMetadataResponse })
    @ApiResponse({ status: 404, description: 'Metadatos no encontrados o región inválida.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateDto: UpdateRagDocumentMetadataDto): Promise<RagDocumentMetadata> {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar metadatos por ID' })
    @ApiParam({ name: 'id', description: 'ID a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Metadatos eliminados.' })
    @ApiResponse({ status: 404, description: 'Metadatos no encontrados.' })
    remove(@Param('id') id: string): Promise<RagDocumentMetadata> {
        return this.service.remove(id);
    }
} 