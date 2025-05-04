import { Controller, Param, Query, UsePipes, ValidationPipe, UseGuards, Request, Post, Body } from '@nestjs/common';
import { ServePromptService } from './serve-prompt.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';
import { ExecutePromptParamsDto } from './dto/execute-prompt-params.dto';
import { ExecutePromptQueryDto } from './dto/execute-prompt-query.dto';
import { ExecutePromptBodyDto } from './dto/execute-prompt-body.dto';

@ApiTags('Serve Prompt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('serve-prompt')
export class ServePromptController {
    constructor(private readonly service: ServePromptService) { }

    @Post('execute/:projectId/:promptName/:versionTag')
    @UseGuards(ProjectGuard)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    @ApiOperation({ summary: 'Assembles and prepares a specific prompt version for execution with provided variables' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiParam({ name: 'promptName', description: 'The unique name of the prompt within the project' })
    @ApiParam({ name: 'versionTag', description: 'Specific version tag (e.g., \"v1.2.0\")' })
    @ApiQuery({ name: 'languageCode', required: false, description: 'Optional language code for translation (e.g., \"es\")' })
    @ApiQuery({ name: 'environmentName', required: false, description: 'Optional environment context (currently informational)' })
    @ApiBody({ type: ExecutePromptBodyDto, description: 'Input variables for the prompt' })
    @ApiResponse({ status: 200, description: 'Processed prompt text ready for execution and metadata.', schema: { example: { processedPrompt: "string", metadata: {} } } })
    @ApiResponse({ status: 404, description: 'Project, Prompt, or Version not found.' })
    @ApiResponse({ status: 400, description: 'Invalid parameters or failed template rendering.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
    async executePrompt(
        @Param() params: ExecutePromptParamsDto,
        @Query() query: ExecutePromptQueryDto,
        @Body() body: ExecutePromptBodyDto,
        @Request() req
    ): Promise<{ processedPrompt: string; metadata: any }> {
        return this.service.executePromptVersion(params, query, body);
    }
}
