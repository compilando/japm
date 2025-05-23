import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDefined,
  Length,
  IsLowercase,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO auxiliar para traducciones iniciales (si se decide incluir)
class InitialTranslationDto {
  @ApiProperty({ description: 'Código de idioma ISO (e.g., es, en)' })
  @IsString()
  @IsNotEmpty()
  languageCode: string;

  @ApiProperty({ description: 'Valor traducido del asset' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreatePromptAssetDto {
  @ApiProperty({
    description:
      'Clave única identificadora del asset (e.g., saludo_formal_es)',
    example: 'saludo_formal_es',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Nombre descriptivo del asset',
    example: 'Saludo Formal (España)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Categoría para organizar assets (e.g., Saludos, Despedidas)',
    example: 'Saludos',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Valor inicial del asset para la primera versión (1.0.0)',
    example: 'Texto inicial',
  })
  @IsString()
  @IsNotEmpty()
  initialValue: string;

  @ApiPropertyOptional({
    description: 'Mensaje de cambio para la primera versión',
  })
  @IsOptional()
  @IsString()
  initialChangeMessage?: string;

  @ApiProperty({
    description: 'ID del tenant al que pertenece este asset',
    example: 'tenant-cuid-xxxx',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Traducciones iniciales para diferentes idiomas',
    type: [InitialTranslationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialTranslationDto)
  initialTranslations?: InitialTranslationDto[];

  // Campos obsoletos eliminados:
  // regionId?: string;
  // version?: string;
  // isActive?: boolean;
}
