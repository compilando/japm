import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateOrUpdateAssetTranslationDto {
  @ApiProperty({
    description: 'ISO language code for the translation (e.g., es, fr, de).',
    example: 'es',
  })
  @IsString()
  @IsNotEmpty()
  // @Length(2, 10) // Could be used if following a specific standard like BCP 47
  languageCode: string;

  @ApiProperty({
    description: 'The translated value of the asset for this language.',
    example: 'Translated Hello World',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  // versionId is obtained from the route parameter, not from the body
}
