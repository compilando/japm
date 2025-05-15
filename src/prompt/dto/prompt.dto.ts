import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class PromptDto {
  @ApiProperty({
    description: 'The unique identifier (slug) of the prompt.',
    example: 'welcome-message',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The name of the prompt.',
    example: 'Welcome Message',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Optional description for the prompt.',
    example: 'Greets the user upon first login.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The ID of the project this prompt belongs to.',
    format: 'uuid',
  })
  @IsUUID()
  projectId: string;

  // Consider adding other relevant fields as needed, e.g.:
  // @ApiProperty({ description: 'Tags associated with the prompt.', example: ['greeting', 'onboarding'], required: false, type: [String] })
  // @IsArray()
  // @IsString({ each: true })
  // @IsOptional()
  // tags?: string[];

  // @ApiProperty({ description: 'Timestamp of creation.' })
  // createdAt: Date;

  // @ApiProperty({ description: 'Timestamp of last update.' })
  // updatedAt: Date;
}
