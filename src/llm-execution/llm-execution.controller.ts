import { Controller, Post, Body, UsePipes, ValidationPipe, UseGuards, Logger } from '@nestjs/common';
import { LlmExecutionService } from './llm-execution.service';
import { ExecuteLlmDto } from './dto/execute-llm.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming authentication is needed

@ApiTags('LLM Execution')
@ApiBearerAuth() // Add if authentication is required
@Controller('llm-execution')
export class LlmExecutionController {
  // Inject Logger with context
  private readonly logger = new Logger(LlmExecutionController.name);

  constructor(private readonly llmExecutionService: LlmExecutionService) {}

  @Post('execute')
  @UseGuards(JwtAuthGuard) // Apply guard if needed
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Executes a pre-assembled prompt using a specified AI Model via LangChain' })
  @ApiBody({ type: ExecuteLlmDto })
  @ApiResponse({ status: 200, description: 'LLM execution successful', schema: { example: { result: "LLM response text", modelUsed: "gpt-4o", providerUsed: "openai" } } })
  @ApiResponse({ status: 400, description: 'Invalid request body or unsupported provider.' })
  @ApiResponse({ status: 404, description: 'AI Model not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error (API Key config, LLM call failed, etc.).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' }) // If using JwtAuthGuard
  async executeLlm(
    @Body() executeLlmDto: ExecuteLlmDto,
  ): Promise<{ result: string; modelUsed: string; providerUsed: string; }> {
    this.logger.log(`Received LLM execution request for model ID: ${executeLlmDto.modelId}`);
    // Log prompt length for debugging potential size issues
    this.logger.debug(`Prompt text length: ${executeLlmDto.promptText.length} chars`);
    // Avoid logging full variables if sensitive, maybe just keys or count
    if (executeLlmDto.variables) {
        this.logger.debug(`Received variables keys: ${Object.keys(executeLlmDto.variables).join(', ')}`);
    }

    try {
      const result = await this.llmExecutionService.execute(executeLlmDto);
      this.logger.log(`LLM execution successful for model ID: ${executeLlmDto.modelId}`);
      return result;
    } catch (error) {
      this.logger.error(`LLM execution failed for model ID: ${executeLlmDto.modelId}`, error.stack);
      // Re-throw the error to let NestJS handle the response status code
      throw error;
    }
  }
}
