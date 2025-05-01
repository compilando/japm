import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class CreateTagDto {
    @ApiProperty({ description: 'Nombre único del tag (formato slug)', example: 'bienvenida' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'El nombre del tag solo puede contener letras minúsculas, números y guiones.'
    })
    name: string;

    @ApiPropertyOptional({ description: 'Descripción opcional del tag' })
    @IsString()
    @IsOptional()
    description?: string;

    // Nota: La relación con Prompts se manejará por separado, no al crear el Tag directamente.
}
