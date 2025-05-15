import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromptAssetDto } from './create-prompt-asset.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

// Para actualizar un Asset, solo permitimos cambiar sus metadatos.
// La clave (key), projectId, initialValue, initialChangeMessage son inmutables a través de este DTO.
export class UpdatePromptAssetDto extends PartialType(
  // Omitimos los campos que no deben ser actualizables aquí o que se gestionan de otra forma.
  OmitType(CreatePromptAssetDto, [
    'key',
    'initialValue',
    'initialChangeMessage',
    'name',
  ] as const),
) {
  @ApiPropertyOptional({ description: 'Activa o desactiva el asset' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // El campo projectId fue eliminado de aquí, ya que no se debe permitir cambiar
  // el proyecto de un asset mediante esta operación de actualización.
  // La pertenencia a un proyecto se establece en la creación y es fundamental para su identidad.
}
