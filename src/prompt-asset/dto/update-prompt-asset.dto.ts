import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromptAssetDto } from './create-prompt-asset.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, Length, ValidateIf } from 'class-validator';

// Para actualizar un Asset, solo permitimos cambiar sus metadatos.
// La clave (key) es inmutable.
// El valor (value) y las traducciones se gestionan a través de versiones.
export class UpdatePromptAssetDto extends PartialType(
    OmitType(CreatePromptAssetDto, ['key', 'initialValue', 'initialChangeMessage', 'projectId'] as const)
) {
    @ApiPropertyOptional({ description: 'Activa o desactiva el asset' })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional({ description: 'ID opcional del proyecto al que pertenece el asset (null para desvincular)' })
    @IsOptional()
    @ValidateIf((o, v) => v !== null)
    @IsString()
    @Length(25, 25)
    projectId?: string | null;
} 