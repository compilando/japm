import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer'; // Needed if we have complex types like Date

export class AiModelResponseDto {
  @ApiProperty({
    description: 'Unique CUID of the AI model',
    example: 'clxkzjw8z0000k6x5abcd1234',
  })
  id: string;

  @ApiProperty({
    description: 'Unique name for the AI model within the project',
    example: 'gpt-4o-mini',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Provider of the AI model',
    example: 'OpenAI',
  })
  provider?: string | null; // Allow null

  @ApiPropertyOptional({ description: 'Optional description for the AI model' })
  description?: string | null; // Allow null

  @ApiPropertyOptional({
    description: 'Identifier used for API calls',
    example: 'gpt-4o-mini',
  })
  apiIdentifier?: string | null; // Allow null

  @ApiPropertyOptional({
    description: 'Environment variable name for the API Key',
  })
  apiKeyEnvVar?: string | null; // Allow null

  @ApiPropertyOptional({
    description: 'Default temperature setting',
    example: 0.7,
  })
  temperature?: number | null; // Allow null

  @ApiPropertyOptional({
    description: 'Default max tokens setting',
    example: 4096,
  })
  maxTokens?: number | null; // Allow null

  @ApiPropertyOptional({
    description: 'Whether the model reliably supports JSON output mode',
  })
  supportsJson?: boolean; // Boolean often doesn't need | null unless explicitly set null in DB

  @ApiPropertyOptional({ description: 'Maximum context window size in tokens' })
  contextWindow?: number | null; // Allow null

  @ApiProperty({ description: 'Timestamp of creation' })
  @Type(() => Date) // Ensure proper transformation if needed
  createdAt: Date;

  // projectId is also usually returned by the service, might be useful
  @ApiProperty({
    description: 'ID of the project this model belongs to',
    example: 'clwabcdefgh0001k6x5efgh5678',
  })
  projectId: string;
}
