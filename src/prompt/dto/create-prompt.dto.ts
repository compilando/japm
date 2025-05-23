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
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PromptType } from '@prisma/client';

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

  @ApiProperty({ description: 'The type of prompt' })
  @Transform(({ value }) => {
    // Función helper para validar y mapear valores
    const mapToValidPromptType = (val: any): PromptType => {
      if (typeof val === 'string') {
        // Mapear valores comunes que no están en el enum
        const upperVal = val.toUpperCase();
        switch (upperVal) {
          case 'TASK':
            return PromptType.USER; // Mapear TASK a USER
          case 'USER':
            return PromptType.USER;
          case 'SYSTEM':
            return PromptType.SYSTEM;
          case 'ASSISTANT':
            return PromptType.ASSISTANT;
          case 'GUARD':
            return PromptType.GUARD;
          case 'COMPOSITE':
            return PromptType.COMPOSITE;
          case 'CONTEXT':
            return PromptType.CONTEXT;
          case 'FUNCTION':
            return PromptType.FUNCTION;
          case 'EXAMPLE':
            return PromptType.EXAMPLE;
          case 'TEMPLATE':
            return PromptType.TEMPLATE;
          default:
            return PromptType.USER; // Valor por defecto para strings no reconocidos
        }
      }
      // Si no es string, usar valor por defecto
      return PromptType.USER;
    };

    // Si el valor es un objeto con propiedad 'value', extraer el valor
    if (typeof value === 'object' && value !== null && 'value' in value) {
      const extractedValue = value.value;
      // Si el valor extraído es un objeto vacío, null, o undefined, usar valor por defecto
      if (extractedValue === null || extractedValue === undefined ||
        (typeof extractedValue === 'object' && Object.keys(extractedValue).length === 0)) {
        return PromptType.USER;
      }
      return mapToValidPromptType(extractedValue);
    }

    // Si es null o undefined, usar valor por defecto
    if (value === null || value === undefined) {
      return PromptType.USER;
    }

    return mapToValidPromptType(value);
  })
  @IsEnum(PromptType)
  type: PromptType;

  @ApiProperty({
    description: 'Base prompt text for the first version (1.0.0)',
    example: 'Hello {{customer_name}}, welcome.',
  })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  @ApiProperty({
    description: 'Código de idioma para la primera versión (e.g., en-US, es-ES). Se obtiene del listado de regiones del proyecto.',
    example: 'en-US',
  })
  @IsString()
  @Length(2, 10)
  languageCode: string;

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
