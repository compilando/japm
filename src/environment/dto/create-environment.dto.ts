import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateEnvironmentDto {
  @ApiProperty({
    description: 'Unique name of the environment',
    example: 'production',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Optional description of the environment',
    example: 'Main production environment',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  // No incluimos relaciones como activePromptVersions o activeAssetVersions aquí,
  // ya que normalmente se gestionan a través de endpoints específicos o lógicas separadas.
}
