import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDefined,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO for initial translations (same as in CreatePromptDto)
class InitialTranslationDto {
  // @ApiProperty({ description: 'Código de idioma (e.g., es-ES).', example: 'es-ES' })
  @ApiProperty({
    description: 'Language code (e.g., es-ES).',
    example: 'es-ES',
  })
  @IsString()
  @Length(2, 10)
  languageCode: string;

  // @ApiProperty({ description: 'Texto traducido del prompt para esta versión.' })
  @ApiProperty({ description: 'Translated prompt text for this version.' })
  @IsString()
  @IsDefined()
  promptText: string;
}

export class CreatePromptVersionDto {
  @ApiProperty({
    description: 'El valor/texto del prompt para esta nueva versión',
  })
  @IsString()
  promptText: string;

  @ApiProperty({
    description:
      'Tag de versión para esta nueva versión (e.g., 1.0.0, 1.0.0-beta.1). Debe ser único por prompt.',
    example: '1.0.0',
  })
  @IsString()
  @Length(1, 50)
  @Matches(
    /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/,
    {
      message: 'versionTag debe ser una versión semántica válida (ej: 1.0.0)',
    },
  )
  versionTag: string;

  @ApiProperty({
    description:
      'Código de idioma para esta versión (e.g., en-US, es-ES). Se obtiene del listado de regiones del proyecto.',
    example: 'en-US',
  })
  @IsString()
  @Length(2, 10)
  languageCode: string;

  @ApiPropertyOptional({
    description: 'Mensaje describiendo los cambios en esta versión.',
  })
  @IsString()
  @IsOptional()
  changeMessage?: string;

  @ApiPropertyOptional({
    description: 'Optional initial translations for this new version.',
    type: [InitialTranslationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialTranslationDto)
  @IsOptional()
  initialTranslations?: InitialTranslationDto[];
}
