import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Nombre único de la etiqueta',
    example: 'customer-feedback',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Descripción opcional de la etiqueta',
    example: 'Etiquetas relacionadas con comentarios de clientes.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  // Nota: La relación con Prompts se manejará por separado, no al crear el Tag directamente.
}
