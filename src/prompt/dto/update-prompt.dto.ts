import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';
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

    @ApiPropertyOptional({ description: 'Lista completa de IDs de etiquetas a asociar (reemplaza las existentes). Array vacío para quitar todas.', example: ['cl...uuid1', 'cl...uuid2'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    tagIds?: string[];
} 