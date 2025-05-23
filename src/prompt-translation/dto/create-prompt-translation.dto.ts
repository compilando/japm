import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsLocale, Length } from 'class-validator';

export class CreatePromptTranslationDto {
  @ApiProperty({
    description: 'Código de idioma para esta traducción (formato xx-XX)',
    example: 'es-ES',
  })
  @IsString()
  @IsNotEmpty()
  @IsLocale()
  @Length(5, 5)
  languageCode: string;

  @ApiProperty({ description: 'Texto del prompt traducido a este idioma' })
  @IsString()
  @IsNotEmpty()
  promptText: string;
}
