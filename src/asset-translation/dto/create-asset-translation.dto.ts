import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsLocale, Length } from 'class-validator';

export class CreateAssetTranslationDto {
    @ApiProperty({ description: 'ID de la versión del asset a la que pertenece esta traducción', example: 'cl...........cuid' })
    @IsString()
    @IsNotEmpty()
    versionId: string; // FK a ConversationPromptAssetVersion.id

    @ApiProperty({ description: 'Código de idioma para esta traducción (formato xx-XX)', example: 'es-ES' })
    @IsString()
    @IsNotEmpty()
    @IsLocale()
    @Length(5, 5)
    languageCode: string;

    @ApiProperty({ description: 'Valor del asset traducido a este idioma' })
    @IsString()
    // ¿Permitir valor vacío? Si no, añadir @IsNotEmpty()
    value: string;
}
