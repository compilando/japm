import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class CreatePromptAssetLinkDto {
    @ApiProperty({ description: 'ID de la PromptVersion a la que se vincula el asset.' })
    @IsNotEmpty()
    @IsUUID()
    promptVersionId: string;

    @ApiProperty({ description: 'ID de la PromptAssetVersion que se vincula.' })
    @IsNotEmpty()
    @IsUUID()
    assetVersionId: string;

    @ApiPropertyOptional({ description: 'Contexto de uso o propósito de este asset en el prompt.', example: 'Nombre del producto' })
    @IsOptional()
    @IsString()
    usageContext?: string;

    @ApiPropertyOptional({ description: 'Orden posicional del asset dentro del prompt (si aplica).', example: 1 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @ApiPropertyOptional({ description: 'Lógica de inserción condicional (formato a definir).', example: 'variable_exists:user_name' })
    @IsOptional()
    @IsString()
    insertionLogic?: string;

    @ApiPropertyOptional({ description: 'Indica si el asset es requerido para el prompt (default: true).' })
    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;
} 