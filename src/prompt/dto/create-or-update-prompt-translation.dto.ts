import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDefined, Length } from 'class-validator';

export class CreateOrUpdatePromptTranslationDto {
    @ApiProperty({ description: 'Language code for the translation (e.g., es-ES, fr-FR).', example: 'fr-FR' })
    @IsString()
    @Length(2, 10) // BCP 47
    languageCode: string;

    @ApiProperty({ description: 'Translated prompt text for this version and language.' })
    @IsString()
    @IsDefined()
    promptText: string;
} 