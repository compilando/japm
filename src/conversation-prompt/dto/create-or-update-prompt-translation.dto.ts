import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDefined, Length } from 'class-validator';

export class CreateOrUpdatePromptTranslationDto {
    @ApiProperty({ description: 'Código de idioma de la traducción (e.g., es-ES, fr-FR).', example: 'fr-FR' })
    @IsString()
    @Length(2, 10) // BCP 47
    languageCode: string;

    @ApiProperty({ description: 'Texto traducido del prompt para esta versión y idioma.' })
    @IsString()
    @IsDefined()
    promptText: string;
} 