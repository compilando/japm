import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// No usar PartialType/OmitType.
// Definir explícitamente los campos actualizables: value y changeMessage.
export class UpdatePromptAssetVersionDto {
    @ApiPropertyOptional({ description: 'Nuevo valor/contenido del asset para esta versión.', example: '¡Hola Mundo Corregido!' })
    @IsOptional()
    @IsString()
    value?: string;

    @ApiPropertyOptional({ description: 'Nuevo mensaje describiendo los cambios.', example: 'Corrección de error tipográfico.' })
    @IsOptional()
    @IsString()
    changeMessage?: string;
}
