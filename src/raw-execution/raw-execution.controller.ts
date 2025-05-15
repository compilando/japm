// src/raw-execution/raw-execution.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RawExecutionService } from './raw-execution.service';
import { ExecuteRawDto } from './dto/execute-raw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

// Definir interfaz para el request con projectId
interface RequestWithProject extends ExpressRequest {
  projectId: string; // Asumiendo que ProjectGuard añade esto
}

@ApiTags('Raw Execution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('execute-raw')
export class RawExecutionController {
  private readonly logger = new Logger(RawExecutionController.name);

  constructor(private readonly rawExecutionService: RawExecutionService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary:
      'Executes raw text using a specified System Prompt and AI Model ID.',
  })
  @ApiBody({ type: ExecuteRawDto })
  @ApiResponse({
    status: 200,
    description: 'Execution successful, response from AI model.',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or unsupported provider.',
  })
  @ApiResponse({
    status: 404,
    description: 'SystemPrompt or AIModel not found.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error (API Key config, LLM execution failed).',
  })
  @HttpCode(HttpStatus.OK)
  async executeRawText(
    @Body() executeRawDto: ExecuteRawDto,
  ): Promise<{ response: string }> {
    this.logger.log(
      `Received raw execution request for model ID: ${executeRawDto.aiModelId}, system prompt: ${executeRawDto.systemPromptName}`,
    );
    return this.rawExecutionService.executeRaw(executeRawDto);
  }
}
