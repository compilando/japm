import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsDefined, Length, IsLowercase, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para las traducciones iniciales opcionales
class InitialTranslationDto {
    @ApiProperty({ description: 'Código de idioma (e.g., es-ES)', example: 'es-ES' })
    @IsString()
    @Length(2, 10) // BCP 47 tiene longitud variable
    languageCode: string;

    @ApiProperty({ description: 'Valor traducido del asset' })
    @IsString()
    @IsDefined()
    value: string;
}

export class CreateConversationPromptAssetDto {
    // ID ya no se provee, se genera automáticamente
    // @ApiProperty({ description: 'ID único del asset', example: 'asset_persona_formal_de_v1' })
    // @IsString()
    // id: string;

    @ApiProperty({ description: 'Nombre del asset', example: 'Saludo Formal ES' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Tipo de asset', example: 'Greeting' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiProperty({ description: 'Clave única del asset (formato slug: minúsculas, guiones), usada para {{key}} en prompts', example: 'saludo-formal-es' })
    @IsString()
    @IsLowercase({ message: 'La clave del asset debe estar en minúsculas.' })
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'La clave del asset solo puede contener letras minúsculas, números y guiones.'
    })
    key: string;

    @ApiProperty({ description: 'Valor/contenido BASE del asset para la primera versión (v1.0.0)' })
    @IsString()
    @IsDefined() // Asegurar que el valor base se provea
    value: string; // Este será el valor de la primera versión

    @ApiPropertyOptional({ description: 'Descripción del propósito del asset' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Categoría para organizar assets', example: 'Saludos' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({
        description: 'Traducciones iniciales opcionales para la primera versión',
        type: [InitialTranslationDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InitialTranslationDto)
    @IsOptional()
    initialTranslations?: InitialTranslationDto[];

    // Campos obsoletos eliminados:
    // regionId?: string;
    // version?: string;
    // isActive?: boolean;
} 