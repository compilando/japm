import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateAssetVersionDto {
  @ApiProperty({
    description: 'Valor/contenido del asset para esta versión específica.',
    example: '¡Hola Mundo!',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    description: 'Etiqueta de versión semántica (e.g., 1.1.0, 2.0.0-alpha). Debe ser única para el asset.',
    example: '1.1.0',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/, {
    message: 'versionTag debe ser una versión semántica válida (ej: 1.0.0)',
  })
  versionTag: string;

  @ApiPropertyOptional({
    description:
      'Mensaje describiendo los cambios introducidos en esta versión.',
    example: 'Corregido error tipográfico.',
  })
  @IsOptional()
  @IsString()
  changeMessage?: string;

  // assetId se obtiene de la ruta/parámetro, no del body.
  // createdAt es manejado por la base de datos.
  // traductions se manejan por separado.
}
