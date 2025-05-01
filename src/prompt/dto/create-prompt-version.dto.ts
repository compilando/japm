import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsDefined, Length, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

// DTO anidado para especificar qué versión de asset vincular
class AssetVersionLinkDto {
    @ApiProperty({ description: 'ID de la PromptAssetVersion a vincular.' })
    @IsString()
    @IsDefined()
    assetVersionId: string;

    @ApiPropertyOptional({ description: 'Contexto de uso (opcional).' })
    @IsString()
    @IsOptional()
    usageContext?: string;

    @ApiPropertyOptional({ description: 'Posición/orden (opcional).' })
    @IsInt()
    @IsOptional()
    position?: number;
}

// DTO anidado para traducciones iniciales (igual que en CreatePromptDto)
class InitialTranslationDto {
    @ApiProperty({ description: 'Código de idioma (e.g., es-ES).', example: 'es-ES' })
    @IsString()
    @Length(2, 10)
    languageCode: string;

    @ApiProperty({ description: 'Texto traducido del prompt para esta versión.' })
    @IsString()
    @IsDefined()
    promptText: string;
}

export class CreatePromptVersionDto {
    @ApiProperty({ description: 'Texto BASE del prompt para esta nueva versión.' })
    @IsString()
    @IsDefined()
    promptText: string;

    @ApiProperty({ description: 'Etiqueta única para esta versión dentro del prompt (e.g., v1.1.0, beta-feature-x).', example: 'v1.1.0' })
    @IsString()
    @IsDefined()
    versionTag: string;

    @ApiPropertyOptional({ description: 'Mensaje describiendo los cambios en esta versión.' })
    @IsString()
    @IsOptional()
    changeMessage?: string;

    @ApiProperty({ description: 'Lista de versiones de assets a vincular a esta versión del prompt.', type: [AssetVersionLinkDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssetVersionLinkDto)
    // Permitimos un array vacío si esta versión no usa assets,
    // pero el array debe estar presente.
    @IsDefined()
    assetLinks: AssetVersionLinkDto[];

    @ApiPropertyOptional({
        description: 'Traducciones iniciales opcionales para esta nueva versión.',
        type: [InitialTranslationDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InitialTranslationDto)
    @IsOptional()
    initialTranslations?: InitialTranslationDto[];
} 