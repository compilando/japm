import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// No usar PartialType/OmitType para tener control explícito sobre los tipos actualizables
export class UpdatePromptDto {
  @ApiPropertyOptional({
    description: "New description of the prompt's purpose.",
    example: 'Updated prompt for greetings.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Complete list of Tag IDs to associate (replaces existing ones). Empty array to remove all.',
    example: ['cma...uuid1', 'cma...uuid2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
