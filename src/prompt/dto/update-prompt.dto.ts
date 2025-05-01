import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// No usar PartialType/OmitType para tener control explícito sobre los tipos actualizables
export class UpdatePromptDto {
    @ApiPropertyOptional({ description: 'Nueva descripción del propósito del prompt.', example: 'Prompt actualizado para saludar.' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'ID de la táctica a asociar, o null para desasociar.', example: 'small_talk_continuacion', nullable: true })
    @IsOptional()
    @IsString()
    tacticId?: string | null;

    @ApiPropertyOptional({ description: 'Lista completa de nombres de etiquetas a asociar (reemplaza las existentes). Array vacío para quitar todas.', example: ['despedida'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
} 