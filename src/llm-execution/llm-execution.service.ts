import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AIModel } from '@prisma/client';
// Use standard LangChain core imports
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ExecuteLlmDto } from './dto/execute-llm.dto';

@Injectable()
export class LlmExecutionService {
  // Inject Logger with context
  private readonly logger = new Logger(LlmExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async execute(dto: ExecuteLlmDto): Promise<{ result: string; modelUsed: string; providerUsed: string; }> {
    const { modelId, promptText } = dto;
    this.logger.log(`Executing LLM request for model ID: ${modelId}`);

    // 1. Obtener configuración del modelo AI desde la BD
    this.logger.debug(`Fetching AIModel configuration for ID: ${modelId}`);
    const aiModel = await this.prisma.aIModel.findUnique({
      where: { id: modelId },
    });

    if (!aiModel) {
      this.logger.warn(`AIModel not found for ID: ${modelId}`);
      throw new NotFoundException(`AI Model with ID "${modelId}" not found.`);
    }
    this.logger.debug(`Found AIModel: ${aiModel.name} (Provider: ${aiModel.provider}, Identifier: ${aiModel.apiIdentifier})`);

    // 2. Obtener la API Key desde las variables de entorno
    if (!aiModel.apiKeyEnvVar) {
        this.logger.error(`apiKeyEnvVar not set for AIModel ID ${aiModel.id} (${aiModel.name}).`);
        throw new InternalServerErrorException(`Configuration error: Missing API Key environment variable name for model ${aiModel.name}.`);
    }
    this.logger.debug(`Attempting to get API Key from env var: ${aiModel.apiKeyEnvVar}`);
    const apiKey = this.configService.get<string>(aiModel.apiKeyEnvVar);
    if (!apiKey) {
      this.logger.error(`API Key environment variable "${aiModel.apiKeyEnvVar}" not set.`);
      throw new InternalServerErrorException(`API Key for ${aiModel.provider} is not configured in environment variables.`);
    }
    // Avoid logging the actual key, maybe log its presence/length
    this.logger.debug(`API Key found for ${aiModel.provider} (length: ${apiKey.length}).`);

    // 3. Instanciar el modelo LangChain apropiado
    let chatModel: BaseChatModel;
    this.logger.log(`Instantiating LangChain model for provider: ${aiModel.provider}, model: ${aiModel.apiIdentifier}`);
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
          this.logger.warn(`Unsupported LLM provider attempted: ${aiModel.provider}`);
          throw new BadRequestException(`Unsupported LLM provider: ${aiModel.provider ?? 'Unknown'}`);
      }
      this.logger.debug(`Successfully instantiated ${aiModel.provider} model.`);
    } catch (error) {
        this.logger.error(`Failed to instantiate LangChain model ${aiModel.name}: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Could not instantiate LLM ${aiModel.name}. Check model configuration.`);
    }

    // 4. Llamar al LLM usando LangChain
    this.logger.log(`Invoking LLM ${aiModel.name} with prompt (length: ${promptText.length})...`);
    try {
        const parser = new StringOutputParser();
        const chain = chatModel.pipe(parser);
        const llmResult = await chain.invoke(promptText);
        this.logger.log(`LLM invocation successful for ${aiModel.name}. Output length: ${llmResult?.length ?? 0}`);

        return {
            result: llmResult,
            modelUsed: aiModel.apiIdentifier ?? aiModel.name,
            providerUsed: aiModel.provider ?? 'Unknown',
        };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      this.logger.error(`Error calling LLM ${aiModel.name}: ${errorMessage}`, error.stack);
      throw new InternalServerErrorException(`Failed to get response from LLM ${aiModel.name}: ${errorMessage}`);
    }
  }
}
