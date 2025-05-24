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
  NotFoundException,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  Req,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { PromptAssetService } from './prompt-asset.service';
import { CreatePromptAssetDto } from './dto/create-prompt-asset.dto';
import { UpdatePromptAssetDto } from './dto/update-prompt-asset.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromptAsset, PromptAssetVersion } from '@prisma/client';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { Logger } from '@nestjs/common';
import { PROJECT_ID_PARAM_KEY } from '../common/guards/project.guard';
import { ThrottleCreation, ThrottleRead } from '../common/decorators/throttle.decorator';

interface RequestWithProject extends ExpressRequest {
  projectId: string;
}

@ApiTags('Prompt Assets (for a specific Prompt)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@SetMetadata(PROJECT_ID_PARAM_KEY, 'projectId')
@Controller('projects/:projectId/prompts/:promptId/assets')
export class PromptAssetController {
  private readonly logger = new Logger(PromptAssetController.name);

  constructor(private readonly service: PromptAssetService) { }

  @Post()
  @ThrottleCreation()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary:
      'Crea un nuevo prompt asset (y su primera versión) para un prompt específico',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID del proyecto al que pertenece el prompt',
    type: String,
  })
  @ApiParam({
    name: 'promptId',
    description: 'ID (slug) del prompt padre',
    type: String,
  })
  @ApiBody({ type: CreatePromptAssetDto })
  @ApiResponse({
    status: 201,
    description: 'Asset creado con su versión inicial.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Proyecto o Prompt no encontrado.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto, ya existe un asset con esa key en el prompt.',
  })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('promptId') promptId: string,
    @Param('projectId') projectId: string,
    @Body() createDto: CreatePromptAssetDto,
  ) {
    this.logger.debug(
      `[create] Request for promptId: ${promptId}, projectId: ${projectId}. Body: ${JSON.stringify(createDto, null, 2)}`,
    );
    return this.service.create(createDto, promptId, projectId);
  }

  @Get()
  @ThrottleRead()
  @ApiOperation({
    summary: 'Obtiene todos los prompt assets de un prompt específico',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID del proyecto al que pertenece el prompt',
    type: String,
  })
  @ApiParam({
    name: 'promptId',
    description: 'ID (slug) del prompt padre',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Lista de assets.' })
  @ApiResponse({ status: 404, description: 'Proyecto o Prompt no encontrado.' })
  findAll(
    @Param('promptId') promptId: string,
    @Param('projectId') projectId: string,
  ) {
    this.logger.debug(
      `[findAll] Request for promptId: ${promptId}, projectId: ${projectId}`,
    );
    return this.service.findAll(promptId, projectId);
  }

  @Get(':assetKey')
  @ThrottleRead()
  @ApiOperation({
    summary:
      'Obtiene un prompt asset por su key dentro de un prompt específico',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({
    name: 'promptId',
    description: 'ID (slug) del prompt padre',
    type: String,
  })
  @ApiParam({
    name: 'assetKey',
    description: 'Key única del asset dentro del prompt',
  })
  @ApiResponse({ status: 200, description: 'Asset encontrado con detalles.' })
  @ApiResponse({ status: 404, description: 'Proyecto o Asset no encontrado.' })
  findOne(
    @Param('promptId') promptId: string,
    @Param('projectId') projectId: string,
    @Param('assetKey') key: string,
  ) {
    this.logger.debug(
      `[findOne] Request for assetKey: ${key}, promptId: ${promptId}, projectId: ${projectId}`,
    );
    return this.service.findOne(key, promptId, projectId);
  }

  @Patch(':assetKey')
  @ThrottleCreation()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({
    summary:
      'Actualiza metadatos de un prompt asset (nombre, descripción, etc.) dentro de un prompt',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({
    name: 'promptId',
    description: 'ID (slug) del prompt padre',
    type: String,
  })
  @ApiParam({
    name: 'assetKey',
    description: 'Key única del asset a actualizar',
  })
  @ApiBody({ type: UpdatePromptAssetDto })
  @ApiResponse({ status: 200, description: 'Asset actualizado.' })
  @ApiResponse({ status: 404, description: 'Proyecto o Asset no encontrado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  update(
    @Param('promptId') promptId: string,
    @Param('projectId') projectId: string,
    @Param('assetKey') key: string,
    @Body() updateDto: UpdatePromptAssetDto,
  ) {
    this.logger.debug(
      `[update] Request for assetKey: ${key}, promptId: ${promptId}, projectId: ${projectId}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    );
    return this.service.update(key, updateDto, promptId, projectId);
  }

  @Delete(':assetKey')
  @ThrottleCreation()
  @ApiOperation({
    summary:
      'Elimina un prompt asset (y sus versiones/traducciones por Cascade) dentro de un prompt',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto', type: String })
  @ApiParam({
    name: 'promptId',
    description: 'ID (slug) del prompt padre',
    type: String,
  })
  @ApiParam({ name: 'assetKey', description: 'Key única del asset a eliminar' })
  @ApiResponse({ status: 200, description: 'Asset eliminado.' })
  @ApiResponse({ status: 404, description: 'Proyecto o Asset no encontrado.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto al eliminar (revisar relaciones sin Cascade).',
  })
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('promptId') promptId: string,
    @Param('projectId') projectId: string,
    @Param('assetKey') key: string,
  ) {
    this.logger.debug(
      `[remove] Request for assetKey: ${key}, promptId: ${promptId}, projectId: ${projectId}`,
    );
    return this.service.remove(key, promptId, projectId);
  }
}
