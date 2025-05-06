import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNotEmpty, IsLocale, Length } from 'class-validator';

export class CreateCulturalDataDto {
    @ApiProperty({ description: 'Unique ID for this cultural data (slug format)', example: 'direct-and-formal' })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ description: 'Associated region ID (xx-XX language code)', example: 'es-ES' })
    @IsString()
    @IsNotEmpty()
    @IsLocale()
    @Length(5, 5)
    regionId: string;

    @ApiProperty({ description: 'Formality level (optional)', required: false, example: 5 })
    @IsInt()
    @IsOptional()
    formalityLevel?: number;

    @ApiProperty({ description: 'Communication style (optional)', required: false, example: 'Direct' })
    @IsString()
    @IsOptional()
    style?: string;

    @ApiProperty({ description: 'Cultural considerations (optional)', required: false })
    @IsString()
    @IsOptional()
    considerations?: string;

    @ApiProperty({ description: 'Additional notes (optional)', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
} 