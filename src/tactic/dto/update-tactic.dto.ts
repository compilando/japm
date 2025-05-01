import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTacticDto } from './create-tactic.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Permitir actualizar campos excepto el nombre (ID)
// Redefinir explícitamente para permitir null en FKs
export class UpdateTacticDto {
    @ApiPropertyOptional({ description: 'Nueva configuración específica de la táctica (e.g., JSON string)' })
    @IsOptional()
    @IsString()
    tacticsConfig?: string;

    @ApiPropertyOptional({ description: 'Nuevo código de idioma de la región asociada, o null para desasociar.', example: 'en-US', nullable: true })
    @IsOptional()
    @IsString()
    regionId?: string | null;

    @ApiPropertyOptional({ description: 'Nuevo ID de los datos culturales asociados, o null para desasociar.', example: 'informal-and-direct', nullable: true })
    @IsOptional()
    @IsString() // O IsUUID
    culturalDataId?: string | null;

    @ApiPropertyOptional({ description: 'Nuevo ID del proyecto asociado, o null para desasociar.', nullable: true })
    @IsOptional()
    @IsUUID()
    projectId?: string | null; // Añadido y permite null
}

// Alternativa si no se necesita permitir null explícitamente para desconectar:
// export class UpdateTacticDto extends PartialType(
//     OmitType(CreateTacticDto, ['name'] as const)
// ) { } 