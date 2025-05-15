import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Prompt, PromptVersion } from '@prisma/client';
import { ProjectService } from '../project/project.service';
import { GeneratePromptStructureDto } from './dto/generate-prompt-structure.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PromptDto } from './dto/prompt.dto';
import { LoadPromptStructureDto } from './dto/load-prompt-structure.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
// import { PromptVersionDto } from './dto/prompt-version.dto';
// import { UpdatePromptVersionDto } from './dto/update-prompt-version.dto';

@ApiTags('Prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/prompts')
export class PromptController {
  private readonly logger = new Logger(PromptController.name);

  constructor(
    private readonly promptService: PromptService,
    private readonly projectService: ProjectService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new prompt within a project' })
  @ApiResponse({
    status: 201,
    description: 'The prompt has been successfully created.',
    type: PromptDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createPromptDto: CreatePromptDto,
    @Req() req: any,
  ): Promise<Prompt> {
    this.logger.log(`REQ ${req.method} ${req.url} ${JSON.stringify(req.body)}`);
    const tenantId = req.user.tenantId;
    await this.projectService.findOne(projectId, tenantId);

    const createdPrompt = await this.promptService.create(
      createPromptDto,
      projectId,
    );
    this.logger.log(
      `RES ${HttpStatus.CREATED} ${req.method} ${req.url} ${JSON.stringify(createdPrompt)}`,
    );
    return createdPrompt;
  }

  @Get()
  @ApiOperation({ summary: 'Get all prompts for a project' })
  @ApiResponse({
    status: 200,
    description: 'Array of prompts for the project.',
    type: [PromptDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async findAllByProject(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ): Promise<Prompt[]> {
    this.logger.log(
      `REQ ${req.method} ${req.url} - Fetching all prompts for project ${projectId}`,
    );
    const tenantId = req.user.tenantId;
    await this.projectService.findOne(projectId, tenantId);

    const prompts = await this.promptService.findAll(projectId);
    this.logger.log(
      `RES ${HttpStatus.OK} ${req.method} ${req.url} - Found ${prompts.length} prompts for project ${projectId}`,
    );
    return prompts;
  }

  @Get(':promptId')
  @ApiOperation({
    summary: 'Get a specific prompt by its ID (slug) for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'The prompt object.',
    type: PromptDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'The ID of the project.',
  })
  @ApiParam({
    name: 'promptId',
    type: String,
    description: 'The ID (slug) of the prompt.',
  })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('promptId') promptId: string,
    @Req() req: any,
  ): Promise<Prompt> {
    this.logger.log(
      `REQ ${req.method} ${req.url} - Fetching prompt ${promptId} for project ${projectId}`,
    );
    const tenantId = req.user.tenantId;
    await this.projectService.findOne(projectId, tenantId);

    const prompt = await this.promptService.findOne(promptId, projectId);
    this.logger.log(
      `RES ${HttpStatus.OK} ${req.method} ${req.url} - Found prompt ${promptId} for project ${projectId}`,
    );
    return prompt;
  }

  @Patch(':promptIdSlug')
  @ApiOperation({ summary: 'Update an existing prompt by its ID (slug)' })
  @ApiResponse({
    status: 200,
    description: 'The prompt has been successfully updated.',
    type: PromptDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Prompt or Project not found.' })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'The ID of the project.',
  })
  @ApiParam({
    name: 'promptIdSlug',
    type: String,
    description: 'The ID (slug) of the prompt to update.',
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('promptIdSlug') promptIdSlug: string,
    @Body() updatePromptDto: UpdatePromptDto,
    @Req() req: any,
  ): Promise<Prompt> {
    this.logger.log(`REQ ${req.method} ${req.url} ${JSON.stringify(req.body)}`);
    const tenantId = req.user.tenantId;
    await this.projectService.findOne(projectId, tenantId);

    const updatedPrompt = await this.promptService.update(
      promptIdSlug,
      updatePromptDto,
      projectId,
    );
    this.logger.log(
      `RES ${HttpStatus.OK} ${req.method} ${req.url} ${JSON.stringify(updatedPrompt)}`,
    );
    return updatedPrompt;
  }

  @Post('generate-structure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Analyzes a user prompt using an LLM and suggests a structure based on project entities.',
  })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'The ID of the project.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the suggested JSON structure.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          example: {
            prompt: { name: 'Suggested Prompt Name', description: '...' },
            version: { semanticVersion: '1.0.0' },
            assets: [
              {
                name: 'Greeting Text',
                description: 'Main greeting text',
                translations: [
                  { regionCode: 'en-US', text: 'Hello World' },
                  { regionCode: 'es-ES', text: 'Hola Mundo' },
                ],
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., missing user prompt).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error (LLM failure, file read error, etc.).',
  })
  async generateStructure(
    @Param('projectId') projectId: string,
    @Body() generatePromptStructureDto: GeneratePromptStructureDto,
    @Req() req: any,
  ): Promise<object> {
    this.logger.debug(
      `==> ENTERED generateStructure Controller Method - ProjectID: ${projectId}, TenantID: ${req.user?.tenantId}, Body: ${JSON.stringify(generatePromptStructureDto)}`,
    );
    const tenantId = req.user.tenantId;

    const project = await this.projectService.findOne(projectId, tenantId);
    if (!project || !project.regions) {
      this.logger.error(
        `Project or project regions not found for projectId: ${projectId} and tenantId: ${tenantId}`,
      );
      throw new NotFoundException(
        `Project with ID "${projectId}" or its regions not found for your tenant.`,
      );
    }

    this.logger.log(
      `REQ ${req.method} ${req.url} projectId=${projectId} ${JSON.stringify(req.body)}`,
    );
    try {
      const structure = await this.promptService.generateStructure(
        projectId,
        generatePromptStructureDto.userPrompt,
        project.regions.map((r) => ({
          languageCode: r.languageCode,
          name: r.name,
        })),
      );
      this.logger.log(
        `RES ${HttpStatus.OK} ${req.method} ${req.url} ${JSON.stringify(structure)}`,
      );
      return structure;
    } catch (error) {
      this.logger.error(
        `Error generating structure for project ${projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('load-structure')
  @ApiOperation({
    summary:
      'Load a generated prompt structure and create all related entities in the database.',
  })
  @ApiResponse({
    status: 201,
    description: 'Prompt structure successfully loaded and entities created.',
    type: PromptDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid JSON structure or data.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - A prompt with the same identifier already exists or an asset key conflict.',
  })
  async loadStructure(
    @Param('projectId') projectId: string,
    @Body() loadPromptDto: LoadPromptStructureDto,
    @Req() req: any,
  ): Promise<Prompt> {
    this.logger.log(
      `REQ ${req.method} ${req.url} projectId=${projectId} - Loading prompt structure: ${JSON.stringify(loadPromptDto)}`,
    );
    const tenantId = req.user.tenantId;

    await this.projectService.findOne(projectId, tenantId);

    const createdPrompt = await this.promptService.loadStructure(
      projectId,
      loadPromptDto,
    );

    this.logger.log(
      `RES ${HttpStatus.CREATED} ${req.method} ${req.url} - Prompt structure loaded successfully for project ${projectId}`,
    );
    return createdPrompt;
  }

  @Delete(':promptIdSlug')
  @ApiOperation({ summary: 'Delete a prompt by its slug within a project' })
  @ApiResponse({
    status: 204,
    description: 'The prompt has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden. Project does not belong to tenant or prompt does not belong to project.',
  })
  @ApiResponse({ status: 404, description: 'Project or Prompt not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('projectId') projectId: string,
    @Param('promptIdSlug') promptIdSlug: string,
    @Req() req: any,
  ): Promise<void> {
    this.logger.log(
      `REQ ${req.method} ${req.url} - Deleting prompt ${promptIdSlug} from project ${projectId}`,
    );
    const tenantId = req.user.tenantId;

    await this.projectService.findOne(projectId, tenantId);

    await this.promptService.remove(promptIdSlug, projectId);

    this.logger.log(
      `RES ${HttpStatus.NO_CONTENT} ${req.method} ${req.url} - Prompt ${promptIdSlug} deleted from project ${projectId}`,
    );
  }

  @Post(':promptId/versions')
  @ApiOperation({ summary: 'Create a new version for a specific prompt' })
  @ApiResponse({
    status: 201,
    description: 'The prompt version has been successfully created.',
    type: CreatePromptVersionDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid versionTag format, missing fields).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Prompt or Project not found.' })
  @ApiResponse({ status: 409, description: 'Conflict (e.g., versionTag already exists for this prompt).' })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'The ID of the project.',
  })
  @ApiParam({
    name: 'promptId',
    type: String,
    description: 'The ID (slug) of the prompt.',
  })
  async createVersion(
    @Param('projectId') projectId: string,
    @Param('promptId') promptIdSlug: string,
    @Body() createPromptVersionDto: CreatePromptVersionDto,
    @Req() req: any,
  ): Promise<PromptVersion> {
    this.logger.log(
      `REQ ${req.method} ${req.url} projectId=${projectId} promptId=${promptIdSlug} ${JSON.stringify(req.body)}`,
    );
    const tenantId = req.user.tenantId;
    await this.projectService.findOne(projectId, tenantId);

    const newVersion = await this.promptService.createVersion(
      promptIdSlug,
      createPromptVersionDto,
      projectId,
    );
    this.logger.log(
      `RES ${HttpStatus.CREATED} ${req.method} ${req.url} ${JSON.stringify(newVersion)}`,
    );
    return newVersion;
  }
}
