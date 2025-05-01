import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsDefined, Length, IsUUID, ArrayNotEmpty, ArrayUnique, IsLowercase, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para las traducciones iniciales opcionales (podríamos moverlo a un archivo común)
class InitialTranslationDto {
    @ApiProperty({ description: 'Código de idioma (e.g., es-ES)', example: 'es-ES' })
    @IsString()
    @Length(2, 10)
    languageCode: string;

    @ApiProperty({ description: 'Texto traducido del prompt' })
    @IsString()
    @IsDefined()
    promptText: string;
}

export class CreateConversationPromptDto {
    // ID ya no se provee, se genera automáticamente
    // @ApiProperty({ description: 'ID único del prompt', example: 'prompt_formal_greeting_de_v1' })
    // @IsString()
    // id: string;

    @ApiProperty({ description: 'Nombre único del prompt (formato slug: minúsculas, guiones)', example: 'bienvenida-formal-es' })
    @IsString()
    @IsLowercase({ message: 'El nombre del prompt debe estar en minúsculas.' })
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'El nombre del prompt solo puede contener letras minúsculas, números y guiones, sin guiones al inicio/final o consecutivos.'
    })
    name: string;

    @ApiPropertyOptional({ description: 'Descripción del propósito del prompt' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Texto BASE del prompt para la primera versión (v1.0.0)' })
    @IsString()
    @IsDefined() // Asegurar que el texto base se provea
    promptText: string; // Este será el texto de la primera versión

    @ApiPropertyOptional({ description: 'Nombre de la táctica asociada (formato slug, opcional)', example: 'formal-greeting-es' })
    @IsString()
    @IsLowercase({ message: 'El nombre de la táctica debe estar en minúsculas.' })
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'El nombre de la táctica solo puede contener letras minúsculas, números y guiones.'
    })
    @IsOptional()
    tacticId?: string;

    @ApiPropertyOptional({
        description: 'Lista de nombres de tags para asociar al prompt (formato slug)',
        type: [String],
        example: ['saludo', 'formal']
    })
    @IsArray()
    @IsString({ each: true })
    @IsLowercase({ each: true, message: 'Cada tag debe estar en minúsculas.' })
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { each: true, message: 'Cada tag solo puede contener letras minúsculas, números y guiones.' })
    @ArrayNotEmpty({ each: true }) // No permitir strings vacíos
    @ArrayUnique()
    @IsOptional()
    tags?: string[]; // Array de nombres de tags (slugs)

    @ApiPropertyOptional({
        description: 'Traducciones iniciales opcionales para la primera versión',
        type: [InitialTranslationDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InitialTranslationDto)
    @IsOptional()
    initialTranslations?: InitialTranslationDto[];

    // Campos obsoletos eliminados:
    // regionId?: string;
    // version?: string;
    // isActive?: boolean;
} 