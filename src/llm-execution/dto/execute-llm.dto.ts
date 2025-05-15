import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteLlmDto {
  @ApiProperty({ description: 'ID of the AIModel to use (from the AIModel table)', example: 'clxyz...' })
  @IsString()
  @IsNotEmpty()
  modelId: string;

  @ApiProperty({ description: 'The complete prompt text already processed and ready to send to the LLM', example: 'Translate this text to Spanish: Hello world.' })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  @ApiProperty({
    description: 'Original variables used to assemble the prompt (optional, for logging/context)',
    example: { "userLocale": "en-US", "productName": "AwesomeProduct", "maxItems": 5 },
    required: false
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
} 