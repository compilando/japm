import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class CreateConversationPromptAssetLinkDto {
    @ApiProperty({ description: 'ID de la VERSIÓN del prompt a vincular', example: 'clx...' })
    @IsString()
    @IsNotEmpty()
    promptVersionId: string;

    @ApiProperty({ description: 'ID de la VERSIÓN del asset a vincular', example: 'cly...' })
    @IsString()
    @IsNotEmpty()
    assetVersionId: string;

    @ApiPropertyOptional({ description: 'Contexto de uso del asset en el prompt (opcional)' })
    @IsString()
    @IsOptional()
    usageContext?: string;

    @ApiPropertyOptional({ description: 'Posición/orden del asset en el prompt (opcional)' })
    @IsInt()
    @IsOptional()
    position?: number;
} 