import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsDefined, Length } from 'class-validator';
import { Type } from 'class-transformer';

// DTO anidado para traducciones iniciales
class InitialAssetTranslationDto {
    @ApiProperty({ description: 'Código de idioma (e.g., es-ES).', example: 'es-ES' })
    @IsString()
    @Length(2, 10)
    languageCode: string;

    @ApiProperty({ description: 'Valor traducido del asset para esta versión.' })
    @IsString()
    @IsDefined()
    value: string;
}

export class CreateAssetVersionDto {
    @ApiProperty({ description: 'Valor/Contenido BASE del asset para esta nueva versión.' })
    @IsString()
    @IsDefined()
    value: string;

    @ApiProperty({ description: 'Etiqueta única para esta versión dentro del asset (e.g., v1.1.0, fix-typo).', example: 'v1.0.1' })
    @IsString()
    @IsDefined()
    versionTag: string;

    @ApiPropertyOptional({ description: 'Mensaje describiendo los cambios en esta versión.' })
    @IsString()
    @IsOptional()
    changeMessage?: string;

    @ApiPropertyOptional({
        description: 'Traducciones iniciales opcionales para esta nueva versión.',
        type: [InitialAssetTranslationDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InitialAssetTranslationDto)
    @IsOptional()
    initialTranslations?: InitialAssetTranslationDto[];
} 