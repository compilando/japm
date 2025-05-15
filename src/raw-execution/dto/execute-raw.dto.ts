import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class ExecuteRawDto {
  @ApiProperty({
    description: 'The raw text input from the user.',
    example: 'Explain the process of photosynthesis in simple terms.',
  })
  @IsString()
  @IsNotEmpty()
  userText: string;

  @ApiProperty({
    description: 'The unique name of the SystemPrompt to use.',
    example: 'helpful_assistant_concise',
  })
  @IsString()
  @IsNotEmpty()
  systemPromptName: string;

  @ApiProperty({
    description: 'The unique ID (CUID) of the AIModel to use for execution.',
    example: 'cmac24bp1000ck6x5iwgju5p1',
  })
  @IsString()
  @IsNotEmpty()
  aiModelId: string;

  @ApiProperty({
    description: 'Optional variables to substitute in the system prompt.',
    example: { text: 'Hello world', targetLanguage: 'es-ES' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
