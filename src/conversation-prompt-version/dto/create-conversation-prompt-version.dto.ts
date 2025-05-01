import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class CreateConversationPromptVersionDto {

    @ApiProperty({ description: 'ID (slug) del prompt lógico al que pertenece esta versión', example: 'bienvenida-simple' })
    @IsString()
    @IsNotEmpty()
    promptId: string; // Corresponde a ConversationPrompt.name

    @ApiProperty({ description: 'El texto completo del prompt para esta versión' })
    @IsString()
    @IsNotEmpty()
    promptText: string;

    @ApiPropertyOptional({ description: 'Etiqueta de versión (e.g., v1.0.0, v2.1-beta). Debe ser única por prompt.', example: 'v1.0.0', default: 'v1.0.0' })
    @IsString()
    @IsOptional()
    // Podríamos añadir validación de formato SemVer si se quiere: @Matches(/^v\d+\.\d+\.\d+(-[\w.]+)?$/)
    versionTag?: string = 'v1.0.0';

    @ApiPropertyOptional({ description: 'Mensaje describiendo los cambios en esta versión.', required: false })
    @IsString()
    @IsOptional()
    changeMessage?: string;

    // Las relaciones (translations, assets) se manejan por separado.
}
