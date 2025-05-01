import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateAssetVersionDto {
    @ApiProperty({ description: 'Valor/contenido del asset para esta versión específica.', example: '¡Hola Mundo!' })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiProperty({ description: 'Etiqueta de versión semántica (e.g., v1.1.0, v2.0.0-alpha). Debe ser única para el asset.', example: 'v1.1.0' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^v\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/, {
        message: 'versionTag must be a valid semantic version string (e.g., v1.0.0)'
    })
    versionTag: string;

    @ApiPropertyOptional({ description: 'Mensaje describiendo los cambios introducidos en esta versión.', example: 'Corregido error tipográfico.' })
    @IsOptional()
    @IsString()
    changeMessage?: string;

    // assetId se obtiene de la ruta/parámetro, no del body.
    // createdAt es manejado por la base de datos.
    // traductions se manejan por separado.
} 