import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GeneratePromptStructureDto {
  @ApiProperty({
    description: 'The user prompt text to be analyzed and structured.',
    example:
      'Create a button that says "Hello World" in English and "Hola Mundo" in Spanish.',
  })
  @IsString()
  @IsNotEmpty()
  userPrompt: string;
}
