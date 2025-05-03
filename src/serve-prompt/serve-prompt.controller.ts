import { Controller, Get, Param, Query, UsePipes, ValidationPipe, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ServePromptService } from './serve-prompt.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';
import { ApiProperty } from '@nestjs/swagger';

// DTO for optional query parameters like versionTag and languageCode
class ServePromptOptionsDto {
    @ApiProperty({ required: false, description: 'Optional specific version tag (e.g., \"v1.2.0\"). Defaults to active version.' })
    versionTag?: string;

    @ApiProperty({ required: false, description: 'Optional language code (e.g., \"es\"). Defaults to project default or \"en\".' })
    languageCode?: string;
}

@ApiTags('Serve Prompt (within Project)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('api/projects/:projectId/serve')
export class ServePromptController {
    constructor(private readonly service: ServePromptService) { }

    @Get(':environmentName/:promptName')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Gets and assembles a specific prompt for a given environment within a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'environmentName', description: 'Environment name (e.g., staging, production)' })
    @ApiParam({ name: 'promptName', description: 'The unique name of the prompt within the project' })
    @ApiQuery({ name: 'versionTag', required: false, description: 'Optional specific version tag (e.g., \"v1.2.0\"). Defaults to active version.' })
    @ApiQuery({ name: 'languageCode', required: false, description: 'Optional language code (e.g., \"es\"). Defaults to project default or \"en\".' })
    @ApiResponse({ status: 200, description: 'Processed prompt and metadata.', schema: { example: { processedPrompt: "string", metadata: {} } } })
    @ApiResponse({ status: 404, description: 'Project, Environment, Prompt, or active Version not found.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    @ApiResponse({ status: 400, description: 'Invalid parameters.' })
    async servePrompt(
        @Param('projectId') projectId: string,
        @Param('environmentName') environmentName: string,
        @Param('promptName') promptName: string,
        @Query() options: ServePromptOptionsDto,
        @Request() req
    ): Promise<{ processedPrompt: string; metadata: any }> {
        return this.service.serveProjectPrompt(
            projectId,
            environmentName,
            promptName,
            options.languageCode,
            options.versionTag,
        );
    }
}
