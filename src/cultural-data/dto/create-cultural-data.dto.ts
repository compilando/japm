import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNotEmpty, IsLocale, Length, Min, Max } from 'class-validator';

export class CreateCulturalDataDto {
    @ApiProperty({ description: 'Unique key for the cultural data within the project', example: 'direct-and-formal' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ description: 'ID (CUID) of the Region this data applies to' })
    @IsString()
    @IsNotEmpty()
    @IsLocale()
    @Length(5, 5)
    regionId: string;

    @ApiPropertyOptional({ description: 'Formality level (1-10)' })
    @IsInt()
    @Min(1)
    @Max(10)
    @IsOptional()
    formalityLevel?: number;

    @ApiPropertyOptional({ description: 'Description of the communication style' })
    @IsString()
    @IsOptional()
    style?: string;

    @ApiPropertyOptional({ description: 'Specific cultural considerations' })
    @IsString()
    @IsOptional()
    considerations?: string;

    @ApiPropertyOptional({ description: 'General notes' })
    @IsString()
    @IsOptional()
    notes?: string;

    // projectId se inyectará desde el servicio basado en el parámetro de ruta
} 