import {
  Controller,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  Post,
  Body,
} from '@nestjs/common';
import { ServePromptService } from './serve-prompt.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../common/guards/project.guard';
import { PromptConsumerGuard } from '../common/guards/prompt-consumer.guard';
import { ExecutePromptQueryDto } from './dto/execute-prompt-query.dto';
import { ExecutePromptBodyDto } from './dto/execute-prompt-body.dto';

@ApiTags('Serve Prompt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PromptConsumerGuard)
@Controller('serve-prompt')
export class ServePromptController {
  constructor(private readonly service: ServePromptService) { }

  @Post('execute/:projectId/:promptName/:versionTag/base')
  @UseGuards(ProjectGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({
    summary:
      'Assembles and prepares a specific prompt version (base language) for execution with provided variables',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({
    name: 'promptName',
    description: 'The unique name of the prompt within the project',
  })
  @ApiParam({
    name: 'versionTag',
    description:
      'Specific version tag (e.g., "v1.2.0") or "latest" to use the most recent version',
  })
  @ApiBody({
    type: ExecutePromptBodyDto,
    description: 'Input variables for the prompt',
  })
  @ApiResponse({
    status: 200,
    description: 'Processed prompt text ready for execution and metadata.',
    schema: { example: { processedPrompt: 'string', metadata: {} } },
  })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, or Version not found.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or failed template rendering.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  async executePromptWithoutLanguage(
    @Param('projectId') projectId: string,
    @Param('promptName') promptName: string,
    @Param('versionTag') versionTag: string,
    @Body() body: ExecutePromptBodyDto,
    @Request() req,
  ): Promise<{ processedPrompt: string; metadata: any }> {
    return this.service.executePromptVersion(
      { projectId, promptName, versionTag },
      body,
    );
  }

  @Post('execute/:projectId/:promptName/:versionTag/lang/:languageCode')
  @UseGuards(ProjectGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({
    summary:
      'Assembles and prepares a specific prompt version (specific language) for execution with provided variables',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({
    name: 'promptName',
    description: 'The unique name of the prompt within the project',
  })
  @ApiParam({
    name: 'versionTag',
    description:
      'Specific version tag (e.g., "v1.2.0") or "latest" to use the most recent version',
  })
  @ApiParam({
    name: 'languageCode',
    required: true,
    description: 'Language code for translation (e.g., "es")',
    type: String,
  })
  @ApiBody({
    type: ExecutePromptBodyDto,
    description: 'Input variables for the prompt',
  })
  @ApiResponse({
    status: 200,
    description: 'Processed prompt text ready for execution and metadata.',
    schema: { example: { processedPrompt: 'string', metadata: {} } },
  })
  @ApiResponse({
    status: 404,
    description: 'Project, Prompt, or Version not found.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or failed template rendering.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden Access to Project.' })
  async executePromptWithLanguage(
    @Param('projectId') projectId: string,
    @Param('promptName') promptName: string,
    @Param('versionTag') versionTag: string,
    @Param('languageCode') languageCode: string,
    @Body() body: ExecutePromptBodyDto,
    @Request() req,
  ): Promise<{ processedPrompt: string; metadata: any }> {
    return this.service.executePromptVersion(
      { projectId, promptName, versionTag, languageCode },
      body,
    );
  }
}
