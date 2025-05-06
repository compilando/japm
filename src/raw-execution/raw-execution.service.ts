// src/raw-execution/raw-execution.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ExecuteRawDto } from './dto/execute-raw.dto';
import { ChatOpenAI } from "@langchain/openai";
// Import other LangChain models as needed, e.g., import { ChatAnthropic } from "@langchain/anthropic";

@Injectable()
export class RawExecutionService {
    private readonly logger = new Logger(RawExecutionService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async executeRaw(dto: ExecuteRawDto): Promise<{ response: string }> {
        const { userText, systemPromptName, aiModelId } = dto;

        // 1. Fetch System Prompt (Global)
        const systemPrompt = await this.prisma.systemPrompt.findUnique({
            where: { name: systemPromptName },
        });
        if (!systemPrompt) {
            this.logger.warn(`SystemPrompt not found: ${systemPromptName}`);
            throw new NotFoundException(`SystemPrompt "${systemPromptName}" not found.`);
        }

        // 2. Fetch AI Model by ID (Globally unique CUID)
        const aiModel = await this.prisma.aIModel.findUnique({
            where: { id: aiModelId },
        });
        if (!aiModel) {
            this.logger.warn(`AIModel not found with ID: ${aiModelId}`);
            throw new NotFoundException(`AIModel with ID "${aiModelId}" not found.`);
        }

        // 3. Get API Key
        let apiKey: string | undefined;
        if (aiModel.apiKeyEnvVar) {
            apiKey = this.configService.get<string>(aiModel.apiKeyEnvVar);
        }
        if (!apiKey) {
            this.logger.error(`API Key environment variable "${aiModel.apiKeyEnvVar}" not set or AIModel has no apiKeyEnvVar defined for model ID ${aiModelId}`);
            throw new InternalServerErrorException(`API Key configuration error for model ID "${aiModelId}".`);
        }

        // 4. Construct Final Prompt
        const finalPrompt = `${systemPrompt.promptText}\n\n---\n\nUser Input:\n${userText}`;
        this.logger.debug(`Executing with AI Model: ${aiModel.name}, System Prompt: ${systemPrompt.name}`);

        // 5. Instantiate and Invoke LangChain Model
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
                    this.logger.error(`Unsupported AI model provider: ${aiModel.provider} for model ID ${aiModelId}`);
                    throw new BadRequestException(`Unsupported AI model provider: "${aiModel.provider}".`);
            }

            this.logger.log(`Invoking LLM (${aiModel.provider}/${aiModel.apiIdentifier || aiModel.name} - ID: ${aiModelId})...`);
            const response = await llm.invoke(finalPrompt);
            this.logger.log(`LLM invocation successful.`);

            // Assuming response structure has a 'content' field or similar
            const responseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response);

            return { response: responseContent };

        } catch (error) {
            this.logger.error(`Error during LLM execution for model ID ${aiModelId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to execute prompt with AI model ID "${aiModelId}": ${error.message}`);
        }
    }
} 