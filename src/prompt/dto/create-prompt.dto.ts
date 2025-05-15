import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsArray,
  ValidateNested,
  ArrayUnique,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

// Auxiliary DTO moved here or imported from a common place
class InitialTranslationDto {
  @ApiProperty({ description: 'ISO language code (e.g., es, en)' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 10) // Adjust if necessary
  languageCode: string;

  @ApiProperty({ description: 'Translated prompt text' })
  @IsString()
  @IsNotEmpty()
  promptText: string;
}

export class CreatePromptDto {
  @ApiProperty({
    description: 'Unique prompt name (used as ID)',
    example: 'customer_welcome_greeting',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Prompt name must contain only lowercase letters, numbers, and underscores.',
  })
  name: string;

  @ApiPropertyOptional({
    description: "Description of the prompt's purpose.",
    example: 'Initial prompt to greet a customer.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of tag names to associate.',
    example: ['welcome', 'general'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  tags?: string[];

  @ApiProperty({
    description: 'Base prompt text for the first version (v1.0.0)',
    example: 'Hello {{customer_name}}, welcome.',
  })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  @ApiPropertyOptional({
    description: 'Optional initial translations for the first version',
    type: [InitialTranslationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialTranslationDto)
  initialTranslations?: InitialTranslationDto[];

  // @ApiProperty({ description: 'ID del tenant al que pertenece este prompt', example: 'tenant-cuid-xxxx' })
  // @IsString()
  // @IsNotEmpty()
  // tenantId: string; // REMOVED as per new rule: tenantId comes from authenticated user context

  // activeVersionId is not set on creation, handled separately or when creating the 1st version.
  // versions are handled via their own endpoint/service.
}
