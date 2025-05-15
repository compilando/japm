// src/raw-execution/raw-execution.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ExecuteRawDto } from './dto/execute-raw.dto';
import { ChatOpenAI } from '@langchain/openai';
import { SystemPromptService } from '../system-prompt/system-prompt.service';
// Import other LangChain models as needed, e.g., import { ChatAnthropic } from "@langchain/anthropic";

@Injectable()
export class RawExecutionService {
  private readonly logger = new Logger(RawExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private systemPromptService: SystemPromptService,
  ) {}

  private substituteVariables(
    text: string,
    variables?: Record<string, any>,
  ): string {
    if (!variables) return text;

    return text.replace(/\${([^}]+)}/g, (match, key) => {
      const value = variables[key.trim()];
      return value !== undefined ? value : match;
    });
  }

  async executeRaw(dto: ExecuteRawDto): Promise<{ response: string }> {
    const { userText, systemPromptName, aiModelId, variables } = dto;

    // 1. Fetch System Prompt (Handles file directive resolution)
    const systemPrompt =
      await this.systemPromptService.findOneByName(systemPromptName);
    if (!systemPrompt) {
      this.logger.warn(`SystemPrompt not found: ${systemPromptName}`);
      throw new NotFoundException(
        `SystemPrompt "${systemPromptName}" not found.`,
      );
    }

    // 2. Substitute variables in the system prompt if any
    const processedSystemPrompt = this.substituteVariables(
      systemPrompt.promptText,
      variables,
    );
    this.logger.debug(
      `Processed system prompt with variables: ${processedSystemPrompt}`,
    );

    // 3. Fetch AI Model by ID (Globally unique CUID)
    const aiModel = await this.prisma.aIModel.findUnique({
      where: { id: aiModelId },
    });
    if (!aiModel) {
      this.logger.warn(`AIModel not found with ID: ${aiModelId}`);
      throw new NotFoundException(`AIModel with ID "${aiModelId}" not found.`);
    }

    // 4. Get API Key
    let apiKey: string | undefined;
    if (aiModel.apiKeyEnvVar) {
      apiKey = this.configService.get<string>(aiModel.apiKeyEnvVar);
    }
    if (!apiKey) {
      this.logger.error(
        `API Key environment variable "${aiModel.apiKeyEnvVar}" not set or AIModel has no apiKeyEnvVar defined for model ID ${aiModelId}`,
      );
      throw new InternalServerErrorException(
        `API Key configuration error for model ID "${aiModelId}".`,
      );
    }

    // 5. Construct Final Prompt
    const finalPrompt = `${processedSystemPrompt}\n\n---\n\nUser Input:\n${userText}`;
    this.logger.debug(
      `Executing with AI Model: ${aiModel.name}, System Prompt: ${systemPrompt.name}, Final Prompt: ${finalPrompt}`,
    );

    // 6. Instantiate and Invoke LangChain Model
    try {
      let llm: any; // Use a more specific type if possible, e.g., BaseChatModel
      const modelParams = {
        apiKey: apiKey,
        modelName: aiModel.apiIdentifier || aiModel.name, // Fallback to name if apiIdentifier is null
        temperature: aiModel.temperature ?? undefined,
        maxTokens: aiModel.maxTokens ?? undefined,
        // Add other relevant parameters based on provider (e.g., topP, frequencyPenalty for OpenAI)
      };

      // Basic factory based on provider (extend as needed)
      switch (aiModel.provider?.toLowerCase()) {
        case 'openai':
          llm = new ChatOpenAI(modelParams);
          break;
        // case 'anthropic':
        //     llm = new ChatAnthropic(modelParams);
        //     break;
        // case 'google':
        //     // llm = new ChatGoogleGenerativeAI(...);
        //     break;
        default:
          this.logger.error(
            `Unsupported AI model provider: ${aiModel.provider} for model ID ${aiModelId}`,
          );
          throw new BadRequestException(
            `Unsupported AI model provider: "${aiModel.provider}".`,
          );
      }

      this.logger.log(
        `Invoking LLM (${aiModel.provider}/${aiModel.apiIdentifier || aiModel.name} - ID: ${aiModelId})...`,
      );
      const response = await llm.invoke(finalPrompt);
      this.logger.log(`LLM invocation successful.`);

      // Extract the raw content from the LLM response (might be string or object)
      // Assuming response.content is the primary way Langchain returns the text
      const rawResponseContent = response?.content;

      // Ensure we have a string to return
      const responseText =
        typeof rawResponseContent === 'string'
          ? rawResponseContent
          : JSON.stringify(rawResponseContent ?? '');

      if (typeof rawResponseContent !== 'string') {
        this.logger.warn(
          `LLM response content was not a string for model ID ${aiModelId}. Raw content: ${responseText}`,
        );
      }

      // Return the extracted text directly
      return { response: responseText };
    } catch (error) {
      this.logger.error(
        `Error during LLM execution for model ID ${aiModelId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to execute prompt with AI model ID "${aiModelId}": ${error.message}`,
      );
    }
  }
}
