import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class ServePromptQueryDto {
  @ApiPropertyOptional({
    description:
      'ID of the specific prompt to serve (ignores other filters if provided).',
  })
  @IsString()
  promptId?: string;

  @ApiPropertyOptional({
    description:
      'Language code (e.g., es-ES, en-US) to get the translation. If not provided, the base version text is used.',
    example: 'es-ES',
  })
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({
    description:
      'Tag of the specific prompt version to serve (e.g., 1.0.0). Ignored if useLatestActive is true.',
    example: 'v1.2.1',
  })
  @IsString()
  @IsOptional()
  versionTag?: string;

  @ApiPropertyOptional({
    description:
      'If true (default), searches for the latest active version of the prompt matching the tactic. If false, versionTag must be provided.',
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsOptional()
  useLatestActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Name of the prompt (required if promptId is not given).',
  })
  @IsOptional()
  @IsString()
  promptName?: string;
}
