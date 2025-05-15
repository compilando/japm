import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDefined, Length } from 'class-validator';

export class CreateOrUpdateAssetTranslationDto {
  @ApiProperty({
    description: 'Código de idioma de la traducción (e.g., es-ES, fr-FR).',
    example: 'fr-FR',
  })
  @IsString()
  @Length(2, 10) // BCP 47
  languageCode: string;

  @ApiProperty({
    description: 'Valor traducido del asset para esta versión y idioma.',
  })
  @IsString()
  @IsDefined()
  value: string;
}
