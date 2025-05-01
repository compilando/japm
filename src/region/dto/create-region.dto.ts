import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsTimeZone, IsLocale, IsDefined, Length } from 'class-validator';

export class CreateRegionDto {
    @ApiProperty({ description: 'Código de idioma único que actúa como ID', example: 'de-DE' })
    @IsLocale() // Valida formato como xx-XX
    @IsDefined()
    @Length(5, 5) // Asegurar formato xx-XX
    languageCode: string; // Ahora es el ID

    @ApiProperty({ description: 'Nombre de la región', example: 'Alemania' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'languageCode de la región padre (opcional)', example: 'eu' })
    @IsString()
    @IsOptional()
    parentRegionId?: string; // Referencia a languageCode padre

    @ApiPropertyOptional({ description: 'Zona horaria', example: 'Europe/Berlin' })
    @IsTimeZone()
    @IsOptional()
    timeZone?: string;

    @ApiPropertyOptional({ description: 'Nivel de formalidad por defecto (opcional)', example: 'Formal' })
    @IsString()
    @IsOptional()
    defaultFormalityLevel?: string;

    @ApiPropertyOptional({ description: 'Notas adicionales (opcional)' })
    @IsString()
    @IsOptional()
    notes?: string;

    // Las relaciones como culturalData, tactics, etc.,
    // usualmente no se incluyen directamente en el DTO de creación,
    // se manejan por separado o a través de IDs anidados si es necesario.
} 