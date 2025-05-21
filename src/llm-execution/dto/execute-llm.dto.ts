import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteLlmDto {
  @ApiProperty({
    description: 'ID del modelo de IA a utilizar',
    example: 'gpt-4o-2024-05-13',
  })
  @IsString()
  @IsNotEmpty()
  modelId: string;

  @ApiPropertyOptional({
    description: 'ID del prompt a ejecutar',
    example: 'system-base',
  })
  @IsString()
  @IsOptional()
  promptId?: string;

  @ApiPropertyOptional({
    description: 'ID del proyecto al que pertenece el prompt',
    example: 'codegen-examples',
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Versión del prompt a ejecutar',
    example: '1.0.0',
    default: 'latest',
  })
  @IsString()
  @IsOptional()
  versionTag?: string;

  @ApiPropertyOptional({
    description: 'Código de idioma para el prompt',
    example: 'es-ES',
  })
  @IsString()
  @IsOptional()
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'Variables para sustituir en el prompt',
    example: { userName: 'John', language: 'es-ES' },
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Texto del prompt a ejecutar (solo si no se proporciona promptId)',
    example: 'Escribe un poema sobre la primavera',
  })
  @IsString()
  @IsOptional()
  promptText?: string;
}
