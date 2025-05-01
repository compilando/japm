import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsJSON, IsLowercase, Matches, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTacticDto {
    @ApiProperty({ description: 'Nombre único de la táctica (formato slug: minúsculas, guiones)', example: 'formal-greeting-de' })
    @IsString()
    @IsLowercase({ message: 'El nombre de la táctica debe estar en minúsculas.' })
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'El nombre de la táctica solo puede contener letras minúsculas, números y guiones.'
    })
    name: string;

    @ApiPropertyOptional({ description: 'Código de idioma de la región asociada (e.g., es-ES, opcional)', required: false })
    @IsString()
    @Matches(/^[a-z]{2}-[A-Z]{2}$/, { message: 'El código de idioma debe tener formato xx-XX.' })
    @IsOptional()
    regionId?: string;

    @ApiPropertyOptional({ description: 'ID (slug) de los datos culturales asociados (opcional)', required: false, example: 'direct-and-formal' })
    @IsString()
    @IsOptional()
    culturalDataId?: string;

    @ApiPropertyOptional({ description: 'Configuración específica de la táctica en formato JSON (opcional)', required: false, type: Object })
    @IsJSON()
    @IsOptional()
    tacticsConfig?: string;

    @ApiPropertyOptional({ description: 'ID del proyecto al que pertenece la táctica.' })
    @IsOptional()
    @IsUUID()
    projectId?: string;
} 