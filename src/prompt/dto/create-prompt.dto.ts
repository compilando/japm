import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, IsArray, ValidateNested, ArrayUnique, Length } from 'class-validator';
import { Type } from 'class-transformer';

// DTO auxiliar movido aquí o importado de un lugar común
class InitialTranslationDto {
    @ApiProperty({ description: 'Código de idioma ISO (e.g., es, en)' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 10) // Ajustar si es necesario
    languageCode: string;

    @ApiProperty({ description: 'Texto traducido del prompt' })
    @IsString()
    @IsNotEmpty()
    promptText: string;
}

export class CreatePromptDto {
    @ApiProperty({ description: 'Nombre único del prompt (usado como ID)', example: 'saludo_bienvenida_cliente' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9_]+$/, {
        message: 'Prompt name must contain only lowercase letters, numbers, and underscores.'
    })
    name: string;

    @ApiPropertyOptional({ description: 'Descripción del propósito del prompt.', example: 'Prompt inicial para saludar a un cliente.' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'ID (nombre) de la táctica conversacional asociada.', example: 'small_talk_inicio' })
    @IsOptional()
    @IsString()
    tacticId?: string;

    @ApiPropertyOptional({ description: 'Lista de nombres de etiquetas a asociar.', example: ['bienvenida', 'general'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    tags?: string[];

    @ApiProperty({ description: 'Texto base del prompt para la primera versión (v1.0.0)', example: 'Hola {{nombre_cliente}}, bienvenido.' })
    @IsString()
    @IsNotEmpty()
    promptText: string;

    @ApiPropertyOptional({ description: 'Traducciones iniciales opcionales para la primera versión', type: [InitialTranslationDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InitialTranslationDto)
    initialTranslations?: InitialTranslationDto[];

    // activeVersionId no se establece en la creación, se maneja por separado o al crear la 1ra versión.
    // versions se manejan a través de su propio endpoint/servicio.
} 