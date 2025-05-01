import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConversationTacticService } from './conversation-tactic.service';
import { CreateConversationTacticDto } from './dto/create-conversation-tactic.dto';
import { UpdateConversationTacticDto } from './dto/update-conversation-tactic.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { ConversationTactic, Region, CulturalData } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto'; // Para el DTO de respuesta
import { CreateCulturalDataDto } from '../cultural-data/dto/create-cultural-data.dto'; // Para el DTO de respuesta

// DTO de respuesta
class ConversationTacticResponse extends CreateConversationTacticDto {
    @ApiProperty({ type: () => CreateRegionDto, required: false })
    region?: Region;
    @ApiProperty({ type: () => CreateCulturalDataDto, required: false })
    culturalData?: CulturalData;
    // prompts: ConversationPrompt[]; // Podríamos añadir los prompts también
}

@ApiTags('conversation-tactics')
@Controller('conversation-tactics')
export class ConversationTacticController {
    constructor(private readonly service: ConversationTacticService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Crear una nueva táctica de conversación' })
    @ApiBody({ type: CreateConversationTacticDto })
    @ApiResponse({ status: 201, description: 'Táctica creada.', type: ConversationTacticResponse })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    create(@Body() createDto: CreateConversationTacticDto): Promise<ConversationTactic> {
        return this.service.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todas las tácticas de conversación' })
    @ApiResponse({ status: 200, description: 'Lista de tácticas.', type: [ConversationTacticResponse] })
    findAll(): Promise<ConversationTactic[]> {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una táctica por ID' })
    @ApiParam({ name: 'id', description: 'ID de la táctica', type: String })
    @ApiResponse({ status: 200, description: 'Táctica encontrada.', type: ConversationTacticResponse })
    @ApiResponse({ status: 404, description: 'Táctica no encontrada.' })
    findOne(@Param('id') id: string): Promise<ConversationTactic> {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true }))
    @ApiOperation({ summary: 'Actualizar una táctica por ID' })
    @ApiParam({ name: 'id', description: 'ID a actualizar', type: String })
    @ApiBody({ type: UpdateConversationTacticDto })
    @ApiResponse({ status: 200, description: 'Táctica actualizada.', type: ConversationTacticResponse })
    @ApiResponse({ status: 404, description: 'Táctica no encontrada.' })
    @ApiResponse({ status: 400, description: 'Datos inválidos.' })
    update(@Param('id') id: string, @Body() updateDto: UpdateConversationTacticDto): Promise<ConversationTactic> {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar una táctica por ID' })
    @ApiParam({ name: 'id', description: 'ID a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'Táctica eliminada.' })
    @ApiResponse({ status: 404, description: 'Táctica no encontrada.' })
    remove(@Param('id') id: string): Promise<ConversationTactic> {
        return this.service.remove(id);
    }
}
