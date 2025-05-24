import { Test, TestingModule } from '@nestjs/testing';
import { LlmExecutionService } from '../llm-execution.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PromptResolverService } from '../../prompt/prompt-resolver.service';
import { ServePromptService } from '../../serve-prompt/serve-prompt.service';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ExecuteLlmDto } from '../dto/execute-llm.dto';

// Mock LangChain modules
jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation(() => ({
        pipe: jest.fn().mockReturnThis(),
        invoke: jest.fn(),
    })),
}));

jest.mock('@langchain/anthropic', () => ({
    ChatAnthropic: jest.fn().mockImplementation(() => ({
        pipe: jest.fn().mockReturnThis(),
        invoke: jest.fn(),
    })),
}));

jest.mock('@langchain/core/output_parsers', () => ({
    StringOutputParser: jest.fn().mockImplementation(() => ({})),
}));

describe('LlmExecutionService', () => {
    let service: LlmExecutionService;
    let prismaService: jest.Mocked<PrismaService>;
    let configService: jest.Mocked<ConfigService>;
    let promptResolverService: jest.Mocked<PromptResolverService>;
    let servePromptService: jest.Mocked<ServePromptService>;

    const mockAIModel = {
        id: 'model-1',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        apiIdentifier: 'gpt-3.5-turbo',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LlmExecutionService,
                {
                    provide: PrismaService,
                    useValue: {
                        aIModel: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: PromptResolverService,
                    useValue: {
                        resolvePrompt: jest.fn(),
                    },
                },
                {
                    provide: ServePromptService,
                    useValue: {
                        resolveAssets: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<LlmExecutionService>(LlmExecutionService);
        prismaService = module.get(PrismaService);
        configService = module.get(ConfigService);
        promptResolverService = module.get(PromptResolverService);
        servePromptService = module.get(ServePromptService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        const baseExecuteDto: ExecuteLlmDto = {
            modelId: 'model-1',
            promptText: 'Hello {{name}}',
            variables: { name: 'World' },
        };

        it('should execute LLM with promptText successfully', async () => {
            // Arrange
            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(mockAIModel);
            (configService.get as jest.Mock).mockReturnValue('test-api-key');

            // Mock LangChain chain
            const mockInvoke = jest.fn().mockResolvedValue('Hello World!');
            const { ChatOpenAI } = require('@langchain/openai');
            ChatOpenAI.mockImplementation(() => ({
                pipe: jest.fn().mockReturnValue({
                    invoke: mockInvoke,
                }),
            }));

            // Act
            const result = await service.execute(baseExecuteDto);

            // Assert
            expect(result).toEqual({
                result: 'Hello World!',
                modelUsed: 'gpt-3.5-turbo',
                providerUsed: 'openai',
                metadata: expect.objectContaining({
                    prompt: expect.objectContaining({
                        source: 'direct_prompt_text',
                        variables: ['name'],
                    }),
                    model: expect.objectContaining({
                        id: 'model-1',
                        name: 'GPT-3.5 Turbo',
                        provider: 'openai',
                    }),
                }),
            });
            expect(prismaService.aIModel.findUnique).toHaveBeenCalledWith({
                where: { id: 'model-1' },
            });
        });

        it('should execute LLM with promptId and projectId', async () => {
            // Arrange
            const dtoWithPromptId: ExecuteLlmDto = {
                modelId: 'model-1',
                promptId: 'prompt-1',
                projectId: 'project-1',
                variables: { name: 'World' },
            };

            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(mockAIModel);
            (configService.get as jest.Mock).mockReturnValue('test-api-key');
            (promptResolverService.resolvePrompt as jest.Mock).mockResolvedValue({
                resolvedText: 'Hello World',
                metadata: { version: '1.0.0' },
            });

            const mockInvoke = jest.fn().mockResolvedValue('Hello World!');
            const { ChatOpenAI } = require('@langchain/openai');
            ChatOpenAI.mockImplementation(() => ({
                pipe: jest.fn().mockReturnValue({
                    invoke: mockInvoke,
                }),
            }));

            // Act
            const result = await service.execute(dtoWithPromptId);

            // Assert
            expect(result.result).toBe('Hello World!');
            expect(promptResolverService.resolvePrompt).toHaveBeenCalledWith(
                'project-1',
                'prompt-1',
                'latest',
                undefined,
                { name: 'World' }
            );
        });

        it('should throw NotFoundException when AI model not found', async () => {
            // Arrange
            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(service.execute(baseExecuteDto)).rejects.toThrow(NotFoundException);
            expect(prismaService.aIModel.findUnique).toHaveBeenCalledWith({
                where: { id: 'model-1' },
            });
        });

        it('should throw BadRequestException when neither promptId nor promptText provided', async () => {
            // Arrange
            const invalidDto: ExecuteLlmDto = {
                modelId: 'model-1',
                variables: { name: 'World' },
            };

            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(mockAIModel);

            // Act & Assert
            await expect(service.execute(invalidDto)).rejects.toThrow(BadRequestException);
        });

        it('should handle Anthropic provider correctly', async () => {
            // Arrange
            const anthropicModel = {
                ...mockAIModel,
                provider: 'anthropic',
                apiIdentifier: 'claude-3-sonnet-20240229',
                apiKeyEnvVar: 'ANTHROPIC_API_KEY',
            };

            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(anthropicModel);
            (configService.get as jest.Mock).mockReturnValue('test-anthropic-key');

            const mockInvoke = jest.fn().mockResolvedValue('Hello from Claude!');
            const { ChatAnthropic } = require('@langchain/anthropic');
            ChatAnthropic.mockImplementation(() => ({
                pipe: jest.fn().mockReturnValue({
                    invoke: mockInvoke,
                }),
            }));

            // Act
            const result = await service.execute(baseExecuteDto);

            // Assert
            expect(result.result).toBe('Hello from Claude!');
            expect(result.providerUsed).toBe('anthropic');
            expect(result.modelUsed).toBe('claude-3-sonnet-20240229');
        });

        it('should throw InternalServerErrorException for unsupported provider', async () => {
            // Arrange
            const unsupportedModel = {
                ...mockAIModel,
                provider: 'unsupported-provider',
            };

            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(unsupportedModel);
            (configService.get as jest.Mock).mockReturnValue('test-api-key');

            // Act & Assert
            await expect(service.execute(baseExecuteDto)).rejects.toThrow(InternalServerErrorException);
        });

        it('should handle missing API key configuration', async () => {
            // Arrange
            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(mockAIModel);
            (configService.get as jest.Mock).mockReturnValue(undefined);

            // Act & Assert
            await expect(service.execute(baseExecuteDto)).rejects.toThrow();
        });

        it('should handle variable substitution correctly', async () => {
            // Arrange
            const dtoWithVariables: ExecuteLlmDto = {
                modelId: 'model-1',
                promptText: 'Hello {{name}}, you are {{age}} years old',
                variables: { name: 'John', age: '30' },
            };

            (prismaService.aIModel.findUnique as jest.Mock).mockResolvedValue(mockAIModel);
            (configService.get as jest.Mock).mockReturnValue('test-api-key');

            const mockInvoke = jest.fn().mockResolvedValue('Response');
            const { ChatOpenAI } = require('@langchain/openai');
            ChatOpenAI.mockImplementation(() => ({
                pipe: jest.fn().mockReturnValue({
                    invoke: mockInvoke,
                }),
            }));

            // Act
            await service.execute(dtoWithVariables);

            // Assert
            expect(mockInvoke).toHaveBeenCalledWith('Hello John, you are 30 years old');
        });
    });
}); 