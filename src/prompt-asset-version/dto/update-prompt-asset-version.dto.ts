import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// No usar PartialType/OmitType.
// Definir explícitamente los campos actualizables: value y changeMessage.
export class UpdatePromptAssetVersionDto {
  @ApiPropertyOptional({
    description: 'Nuevo valor/contenido del asset para esta versión.',
    example: '¡Hola Mundo Corregido!',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Nuevo mensaje describiendo los cambios.',
    example: 'Corrección de error tipográfico.',
  })
  @IsOptional()
  @IsString()
  changeMessage?: string;

  @ApiPropertyOptional({
    description: 'Código de idioma para la versión del asset (ej: en-US, es-ES).',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;
}
