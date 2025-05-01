import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class ServePromptQueryDto {
    @ApiPropertyOptional({ description: 'ID del prompt específico a servir (ignora otros filtros si se provee).' })
    @IsString()
    promptId?: string;

    @ApiPropertyOptional({ description: 'ID de la táctica para filtrar prompts (requerido si no se da promptId).' })
    @IsString()
    @IsOptional()
    tacticId?: string;

    @ApiPropertyOptional({
        description: 'Código de idioma (e.g., es-ES, en-US) para obtener la traducción. Si no se provee, se usa el texto base de la versión.',
        example: 'es-ES'
    })
    @IsString()
    languageCode?: string;

    @ApiPropertyOptional({
        description: 'Tag de la versión específica del prompt a servir (e.g., v1.0.0). Ignorado si se usa useLatestActive.',
        example: 'v1.2.1'
    })
    @IsString()
    @IsOptional()
    versionTag?: string;

    @ApiPropertyOptional({
        description: 'Si es true (por defecto), busca la versión activa más reciente del prompt que coincida con la táctica. Si es false, se debe proveer versionTag.',
        type: Boolean,
        default: true
    })
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
    @IsOptional()
    useLatestActive?: boolean = true;
} 