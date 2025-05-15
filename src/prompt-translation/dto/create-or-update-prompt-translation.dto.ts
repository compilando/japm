import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateOrUpdatePromptTranslationDto {
  @ApiProperty({
    description: 'ISO language code for the translation (e.g., es, fr, de).',
    example: 'es',
  })
  @IsString()
  @IsNotEmpty()
  // @Length(2, 10)
  languageCode: string;

  @ApiProperty({
    description: 'The complete prompt text translated to this language.',
    example: 'Translate the following text to Spanish: {{text_to_translate}}',
  })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  // versionId is obtained from the route parameter, not from the body
}
