import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePromptAssetVersionDto {

    @ApiProperty({ description: 'Key (slug) del asset lógico al que pertenece esta versión', example: 'saludo-inicial' })
    @IsString()
    @IsNotEmpty()
    assetId: string; // Corresponde a PromptAsset.key

    @ApiProperty({ description: 'El valor del asset para esta versión' })
    @IsString()
    // ¿Permitir valor vacío? Si no, añadir @IsNotEmpty()
    value: string;

    @ApiPropertyOptional({ description: 'Etiqueta de versión (e.g., v1.0.0). Debe ser única por asset.', example: 'v1.0.0', default: 'v1.0.0' })
    @IsString()
    @IsOptional()
    versionTag?: string = 'v1.0.0';

    @ApiPropertyOptional({ description: 'Mensaje describiendo los cambios en esta versión.', required: false })
    @IsString()
    @IsOptional()
    changeMessage?: string;

    // Las relaciones (translations, links) se manejan por separado.
}
