import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNotEmpty, IsLocale, Length } from 'class-validator';

export class CreateCulturalDataDto {
    @ApiProperty({ description: 'ID único para estos datos culturales (formato slug)', example: 'direct-and-formal' })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ description: 'ID de la región asociada (código de idioma xx-XX)', example: 'es-ES' })
    @IsString()
    @IsNotEmpty()
    @IsLocale()
    @Length(5, 5)
    regionId: string;

    @ApiProperty({ description: 'Nivel de formalidad (opcional)', required: false, example: 5 })
    @IsInt()
    @IsOptional()
    formalityLevel?: number;

    @ApiProperty({ description: 'Estilo de comunicación (opcional)', required: false, example: 'Directo' })
    @IsString()
    @IsOptional()
    style?: string;

    @ApiProperty({ description: 'Consideraciones culturales (opcional)', required: false })
    @IsString()
    @IsOptional()
    considerations?: string;

    @ApiProperty({ description: 'Notas adicionales (opcional)', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
} 