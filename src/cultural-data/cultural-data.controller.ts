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
import { CulturalDataService } from './cultural-data.service';
import { CreateCulturalDataDto } from './dto/create-cultural-data.dto';
import { UpdateCulturalDataDto } from './dto/update-cultural-data.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiProperty,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CulturalData, Region } from '@prisma/client';
import { CreateRegionDto } from '../region/dto/create-region.dto';
import { ProjectGuard } from '../common/guards/project.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { Logger } from '@nestjs/common';

// Define interface for request with projectId
interface RequestWithProject extends ExpressRequest {
  projectId: string;
}

// Define a response DTO that includes the region (optional)
class CulturalDataResponse extends CreateCulturalDataDto {
  @ApiProperty({ type: () => CreateRegionDto })
  region?: Region; // Region is optional if disconnecting is allowed

  // Add projectId if you want to show it in the response
  @ApiProperty()
  projectId: string;
}

@ApiTags('Cultural Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/cultural-data')
export class CulturalDataController {
  private readonly logger = new Logger(CulturalDataController.name);

  constructor(private readonly culturalDataService: CulturalDataService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Creates new cultural data within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiBody({ type: CreateCulturalDataDto })
  @ApiResponse({
    status: 201,
    description: 'Cultural data created.',
    type: CulturalDataResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  @ApiResponse({
    status: 404,
    description: 'Project or referenced Region not found.',
  })
  create(
    @Req() req: RequestWithProject,
    @Body() createDto: CreateCulturalDataDto,
  ): Promise<CulturalData> {
    const projectId = req.projectId;
    this.logger.debug(
      `[create] Received request for projectId: ${projectId}. Body: ${JSON.stringify(createDto, null, 2)}`,
    );
    return this.culturalDataService.create(createDto, projectId);
  }

  @Get()
  @ApiOperation({ summary: 'Gets all cultural data for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'List of cultural data.',
    type: [CulturalDataResponse],
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findAll(@Req() req: RequestWithProject): Promise<CulturalData[]> {
    const projectId = req.projectId;
    return this.culturalDataService.findAll(projectId);
  }

  @Get(':culturalDataId')
  @ApiOperation({ summary: 'Gets cultural data by ID within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'culturalDataId',
    description: 'Key of the cultural data (e.g., direct-and-formal)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Cultural data found.',
    type: CulturalDataResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Project or Cultural data not found.',
  })
  findOne(
    @Req() req: RequestWithProject,
    @Param('culturalDataId') id: string,
  ): Promise<CulturalData> {
    const projectId = req.projectId;
    return this.culturalDataService.findOne(id, projectId);
  }

  @Patch(':culturalDataId')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  @ApiOperation({ summary: 'Updates cultural data by ID within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'culturalDataId',
    description: 'Key of the cultural data to update (e.g., direct-and-formal)',
    type: String,
  })
  @ApiBody({ type: UpdateCulturalDataDto })
  @ApiResponse({
    status: 200,
    description: 'Cultural data updated.',
    type: CulturalDataResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Project or Cultural data not found.',
  })
  @ApiResponse({ status: 400, description: 'Invalid data.' })
  update(
    @Req() req: RequestWithProject,
    @Param('culturalDataId') id: string,
    @Body() updateDto: UpdateCulturalDataDto,
  ): Promise<CulturalData> {
    const projectId = req.projectId;
    this.logger.debug(
      `[update] Received PATCH for projectId: ${projectId}, culturalDataId: ${id}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    );
    return this.culturalDataService.update(id, updateDto, projectId);
  }

  @Delete(':culturalDataId')
  @ApiOperation({ summary: 'Deletes cultural data by ID within a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID', type: String })
  @ApiParam({
    name: 'culturalDataId',
    description: 'Key of the cultural data to delete (e.g., direct-and-formal)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Cultural data deleted.' })
  @ApiResponse({
    status: 404,
    description: 'Project or Cultural data not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict on delete (referenced by other entities).',
  })
  remove(
    @Req() req: RequestWithProject,
    @Param('culturalDataId') id: string,
  ): Promise<CulturalData> {
    const projectId = req.projectId;
    return this.culturalDataService.remove(id, projectId);
  }
}
