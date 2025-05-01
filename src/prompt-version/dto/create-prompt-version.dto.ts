import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreatePromptVersionDto {

    @ApiProperty({ description: 'Texto completo del prompt para esta versión.', example: 'Translate the following text to Spanish: {{text_to_translate}}' })
    @IsString()
    @IsNotEmpty()
    promptText: string;

    @ApiProperty({ description: 'Identificador único del prompt lógico al que pertenece esta versión.', example: 'translate_english_to_spanish' })
    @IsString()
    @IsNotEmpty()
    promptId: string; // Corresponde a Prompt.name (antes Prompt.name)

    @ApiProperty({ description: 'Etiqueta de versión semántica (e.g., v1.0.0, v1.1.0-beta). Por defecto v1.0.0', example: 'v1.0.0', default: 'v1.0.0', required: false })
    @IsString()
    @IsNotEmpty()
    @Matches(/^v\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/, {
        message: 'versionTag must be a valid semantic version string (e.g., v1.0.0)'
    })
    versionTag: string = 'v1.0.0';

    @ApiProperty({ description: 'Mensaje describiendo los cambios en esta versión.', example: 'Initial version.', required: false })
    @IsOptional()
    @IsString()
    changeMessage?: string;

    // createdAt es manejado por la base de datos
}
