import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateOrUpdateAssetTranslationDto {
    @ApiProperty({ description: 'Código de idioma ISO para la traducción (e.g., es, fr, de).', example: 'es' })
    @IsString()
    @IsNotEmpty()
    // @Length(2, 10) // Podría usarse si se sigue un estándar específico como BCP 47
    languageCode: string;

    @ApiProperty({ description: 'El valor traducido del asset para este idioma.', example: 'Hola Mundo Traducido' })
    @IsString()
    @IsNotEmpty()
    value: string;

    // versionId se obtiene del parámetro de la ruta, no del body
} 