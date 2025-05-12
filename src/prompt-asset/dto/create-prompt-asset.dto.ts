import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsDefined, Length, IsLowercase, Matches } from 'class-validator';
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
    @ApiProperty({ description: 'Clave única identificadora del asset (e.g., saludo_formal_es)', example: 'saludo_formal_es' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ description: 'Nombre descriptivo del asset', example: 'Saludo Formal (España)' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Categoría para organizar assets (e.g., Saludos, Despedidas)', example: 'Saludos' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ description: 'Valor inicial del asset para la primera versión (v1.0.0)' })
    @IsString()
    @IsNotEmpty()
    initialValue: string;

    @ApiPropertyOptional({ description: 'Mensaje de cambio para la primera versión' })
    @IsOptional()
    @IsString()
    initialChangeMessage?: string;

    @ApiPropertyOptional({ description: 'ID opcional del proyecto al que pertenece el asset' })
    @IsOptional()
    @IsString()
    @Length(25, 25) // Asumiendo que los IDs de proyecto son CUIDs
    projectId?: string;

    @ApiProperty({ description: 'ID del tenant al que pertenece este asset', example: 'tenant-cuid-xxxx' })
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    // Campos obsoletos eliminados:
    // regionId?: string;
    // version?: string;
    // isActive?: boolean;
} 