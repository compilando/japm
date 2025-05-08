import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsDefined, Length, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO to specify which asset version to link
class AssetVersionLinkDto {
    // @ApiProperty({ description: 'ID de la PromptAssetVersion a vincular.' })
    @ApiProperty({ description: 'ID of the PromptAssetVersion to link.' })
    @IsString()
    @IsDefined()
    assetVersionId: string;

    // @ApiPropertyOptional({ description: 'Contexto de uso (opcional).' })
    @ApiPropertyOptional({ description: 'Usage context (optional).' })
    @IsString()
    @IsOptional()
    usageContext?: string;

    // @ApiPropertyOptional({ description: 'Posición/orden (opcional).' })
    @ApiPropertyOptional({ description: 'Position/order (optional).' })
    @IsInt()
    @IsOptional()
    position?: number;
}

// Nested DTO for initial translations (same as in CreatePromptDto)
class InitialTranslationDto {
    // @ApiProperty({ description: 'Código de idioma (e.g., es-ES).', example: 'es-ES' })
    @ApiProperty({ description: 'Language code (e.g., es-ES).', example: 'es-ES' })
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
    @ApiProperty({ description: 'El valor/texto del prompt para esta nueva versión' })
    @IsString()
    promptText: string;

    @ApiPropertyOptional({ description: 'Mensaje describiendo los cambios en esta versión.' })
    @IsString()
    @IsOptional()
    changeMessage?: string;

    // @ApiProperty({ description: 'Lista de versiones de assets a vincular a esta versión del prompt.', type: [AssetVersionLinkDto] })
    @ApiProperty({ description: 'List of asset versions to link to this prompt version.', type: [AssetVersionLinkDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssetVersionLinkDto)
    // Allow an empty array if this version uses no assets,
    // but the array must be present.
    @IsDefined()
    assetLinks: AssetVersionLinkDto[];

    // @ApiPropertyOptional({
    //     description: 'Traducciones iniciales opcionales para esta nueva versión.',
    //     type: [InitialTranslationDto]
    // })
    @ApiPropertyOptional({
        description: 'Optional initial translations for this new version.',
        type: [InitialTranslationDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InitialTranslationDto)
    @IsOptional()
    initialTranslations?: InitialTranslationDto[];
} 