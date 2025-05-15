import { PartialType } from '@nestjs/swagger';
import { CreateTagDto } from './create-tag.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateTagDto extends PartialType(CreateTagDto) {
  @ApiProperty({
    description: 'Nuevo nombre único de la etiqueta (opcional)',
    example: 'user-feedback',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Nueva descripción opcional de la etiqueta',
    example: 'Comentarios generales de los usuarios.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
