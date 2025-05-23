import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class CreateAssetTranslationDto {
  @ApiProperty({
    description: 'Código de idioma para esta traducción (formato xx-XX)',
    example: 'es-ES',
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, {
    message:
      'El código de idioma debe seguir el formato xx-XX (ej: es-ES, en-US)',
  })
  languageCode: string;

  @ApiProperty({ description: 'Valor del asset traducido a este idioma' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
