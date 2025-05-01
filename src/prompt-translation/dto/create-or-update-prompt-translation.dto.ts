import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateOrUpdatePromptTranslationDto {
    @ApiProperty({ description: 'Código de idioma ISO para la traducción (e.g., es, fr, de).', example: 'es' })
    @IsString()
    @IsNotEmpty()
    // @Length(2, 10)
    languageCode: string;

    @ApiProperty({ description: 'El texto completo del prompt traducido a este idioma.', example: 'Traduce el siguiente texto al Español: {{text_to_translate}}' })
    @IsString()
    @IsNotEmpty()
    promptText: string;

    // versionId se obtiene del parámetro de la ruta, no del body
} 