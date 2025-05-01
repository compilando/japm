import { PartialType } from '@nestjs/swagger';
import { CreateEnvironmentDto } from './create-environment.dto';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// PartialType hereda las validaciones y ApiProperty de CreateEnvironmentDto,
// pero hace todos los campos opcionales.
export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {

    // Podríamos añadir validaciones específicas para la actualización si fuera necesario.
    // Por ejemplo, si quisiéramos que el nombre no se pudiera cambiar una vez creado,
    // podríamos eliminarlo de este DTO o añadir una validación que lo impida.

    // Sobrescribimos las propiedades si necesitamos cambiar la descripción o ejemplos en Swagger
    @ApiProperty({ description: 'Nuevo nombre único del entorno (opcional)', example: 'staging', required: false, maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiProperty({ description: 'Nueva descripción opcional del entorno', example: 'Entorno de pruebas pre-producción', required: false })
    @IsOptional()
    @IsString()
    description?: string;
} 