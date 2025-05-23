import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AIModel } from '@prisma/client';
// Use standard LangChain core imports
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ExecuteLlmDto } from './dto/execute-llm.dto';
import { PromptResolverService } from '../prompt/prompt-resolver.service';
import { ServePromptService } from '../serve-prompt/serve-prompt.service';

@Injectable()
export class LlmExecutionService {
  // Inject Logger with context
  private readonly logger = new Logger(LlmExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private promptResolver: PromptResolverService,
    private servePromptService: ServePromptService,
  ) {}

  async execute(
    dto: ExecuteLlmDto,
  ): Promise<{ result: string; modelUsed: string; providerUsed: string; metadata: any }> {
    const { modelId, promptId, projectId, versionTag, languageCode, variables } = dto;
    this.logger.log(`Executing LLM request for model ID: ${modelId}`);

    // 1. Resolver el prompt y sus referencias
    let resolvedPrompt: string;
    let promptMetadata: any;
    
    if (promptId && projectId) {
      const resolved = await this.promptResolver.resolvePrompt(
        projectId,
        promptId,
        versionTag || 'latest',
        languageCode,
        variables || {},
      );
      resolvedPrompt = resolved.resolvedText;
      promptMetadata = resolved.metadata;
    } else if (dto.promptText) {
      // Cuando se usa promptText directamente, también necesitamos procesar variables y referencias
      if (projectId) {
        try {
          // Usar el ServePromptService para procesar el texto completo
          const tempPromptId = 'temp-prompt';
          
          // Resolver assets y variables usando el ServePromptService
          const { processedText } = await this.servePromptService.resolveAssets(
            dto.promptText,
            tempPromptId,
            projectId,
            languageCode,
            variables || {}
          );
          resolvedPrompt = processedText;
        } catch (error) {
          this.logger.warn(
            `Error processing promptText with ServePromptService: ${error.message}. Falling back to simple variable substitution.`
          );
          resolvedPrompt = this.simpleVariableSubstitution(dto.promptText, variables || {});
        }
      } else {
        // Sin projectId, solo procesamiento simple de variables
        resolvedPrompt = this.simpleVariableSubstitution(dto.promptText, variables || {});
      }
      
      promptMetadata = {
        source: 'direct_prompt_text',
        variables: Object.keys(variables || {}),
        originalLength: dto.promptText.length,
        processedLength: resolvedPrompt.length
      };
    } else {
      throw new BadRequestException('Either promptId with projectId or promptText must be provided');
    }

    // 2. Get AI model configuration from DB
    this.logger.debug(`Fetching AIModel configuration for ID: ${modelId}`);
    const aiModel = await this.prisma.aIModel.findUnique({
      where: { id: modelId },
    });

    if (!aiModel) {
      this.logger.warn(`AIModel not found for ID: ${modelId}`);
      throw new NotFoundException(`AI Model with ID "${modelId}" not found.`);
    }
    this.logger.debug(
      `Found AIModel: ${aiModel.name} (Provider: ${aiModel.provider}, Identifier: ${aiModel.apiIdentifier})`,
    );

    // 3. Get API Key from environment variables
    if (!aiModel.apiKeyEnvVar) {
      this.logger.error(
        `apiKeyEnvVar not set for AIModel ID ${aiModel.id} (${aiModel.name}).`,
      );
      throw new InternalServerErrorException(
        `Configuration error: Missing API Key environment variable name for model ${aiModel.name}.`,
      );
    }
    this.logger.debug(
      `Attempting to get API Key from env var: ${aiModel.apiKeyEnvVar}`,
    );
    const apiKey = this.configService.get<string>(aiModel.apiKeyEnvVar);
    if (!apiKey) {
      this.logger.error(
        `API Key environment variable "${aiModel.apiKeyEnvVar}" not set.`,
      );
      throw new InternalServerErrorException(
        `API Key for ${aiModel.provider} is not configured in environment variables.`,
      );
    }
    // Avoid logging the actual key, maybe log its presence/length
    this.logger.debug(
      `API Key found for ${aiModel.provider} (length: ${apiKey.length}).`,
    );

    // 4. Instantiate the appropriate LangChain model
    let chatModel: BaseChatModel;
    this.logger.log(
      `Instantiating LangChain model for provider: ${aiModel.provider}, model: ${aiModel.apiIdentifier}`,
    );
    try {
      switch (aiModel.provider?.toLowerCase()) {
        case 'openai':
          chatModel = new ChatOpenAI({
            apiKey: apiKey,
            modelName: aiModel.apiIdentifier ?? undefined,
            temperature: aiModel.temperature ?? undefined,
            maxTokens: aiModel.maxTokens ?? undefined,
          });
          break;
        case 'anthropic':
          chatModel = new ChatAnthropic({
            apiKey: apiKey,
            modelName: aiModel.apiIdentifier ?? undefined,
            temperature: aiModel.temperature ?? undefined,
            maxTokens: aiModel.maxTokens ?? undefined,
          });
          break;
        default:
          this.logger.warn(
            `Unsupported LLM provider attempted: ${aiModel.provider}`,
          );
          throw new BadRequestException(
            `Unsupported LLM provider: ${aiModel.provider ?? 'Unknown'}`,
          );
      }
      this.logger.debug(`Successfully instantiated ${aiModel.provider} model.`);
    } catch (error) {
      this.logger.error(
        `Failed to instantiate LangChain model ${aiModel.name}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Could not instantiate LLM ${aiModel.name}. Check model configuration.`,
      );
    }

    // 5. Call the LLM using LangChain
    this.logger.log(
      `Invoking LLM ${aiModel.name} with prompt (length: ${resolvedPrompt.length})...`,
    );
    try {
      const parser = new StringOutputParser();
      const chain = chatModel.pipe(parser);
      const llmResult = await chain.invoke(resolvedPrompt);
      this.logger.log(
        `LLM invocation successful for ${aiModel.name}. Output length: ${llmResult?.length ?? 0}`,
      );

      return {
        result: llmResult,
        modelUsed: aiModel.apiIdentifier ?? aiModel.name,
        providerUsed: aiModel.provider ?? 'Unknown',
        metadata: {
          prompt: promptMetadata,
          model: {
            id: aiModel.id,
            name: aiModel.name,
            provider: aiModel.provider,
            temperature: aiModel.temperature,
            maxTokens: aiModel.maxTokens,
          },
        },
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        'Unknown error';
      this.logger.error(
        `Error calling LLM ${aiModel.name}: ${errorMessage}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get response from LLM ${aiModel.name}: ${errorMessage}`,
      );
    }
  }

  private simpleVariableSubstitution(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
      const variableName = p1.trim();
      
      // Skip if it's an asset or prompt reference
      if (variableName.startsWith('asset:') || 
          variableName.startsWith('prompt:') || 
          variableName.startsWith('variable:')) {
        return match;
      }
      
      const value = variables[variableName];
      if (value !== undefined) {
        this.logger.debug(`Substituting variable "${variableName}" = "${value}"`);
        return value.toString();
      } else {
        this.logger.warn(`Variable "${variableName}" not found in provided variables`);
        return match;
      }
    });
  }
}