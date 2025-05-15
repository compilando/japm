import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSystemPromptDto {
  @ApiProperty({
    description: 'Unique name/identifier for the system prompt',
    example: 'summarize_meeting_notes',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // Example length limit
  name: string;

  @ApiPropertyOptional({
    description: "Optional description of the prompt's purpose",
    example: 'Summarizes long meeting transcripts into key points.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'The actual text content of the system prompt',
    example: 'Summarize the following text into bullet points...',
  })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  @ApiPropertyOptional({
    description: 'Optional category for grouping prompts',
    example: 'summarization',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
