import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePromptAssetVersionDto {
  // assetId (entendido como la key del PromptAsset) se eliminará de aquí,
  // ya que se obtendrá del parámetro de ruta :assetKey en el controlador.

  @ApiProperty({ description: 'El valor del asset para esta nueva versión' })
  @IsString()
  // Considerar @IsNotEmpty() si el valor no puede ser una cadena vacía.
  value: string;

  @ApiPropertyOptional({
    description:
      'Etiqueta de versión (e.g., v1.0.1, v1.1.0). Si no se provee, se podría auto-incrementar o requerir.',
    example: 'v1.0.1',
  })
  @IsString()
  @IsNotEmpty() // Hacerlo requerido para nuevas versiones explícitas después de la v1.0.0 inicial.
  versionTag: string; // Cambiado de opcional a requerido

  @ApiPropertyOptional({
    description: 'Mensaje describiendo los cambios en esta versión.',
  })
  @IsString()
  @IsOptional()
  changeMessage?: string;

  // Las relaciones (translations, links) se manejan por separado.
}
