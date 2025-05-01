import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateEnvironmentDto {
    @ApiProperty({
        description: 'Nombre único del entorno',
        example: 'produccion',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Descripción opcional del entorno',
        example: 'Entorno de producción principal',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    // No incluimos relaciones como activePromptVersions o activeAssetVersions aquí,
    // ya que normalmente se gestionan a través de endpoints específicos o lógicas separadas.
} 