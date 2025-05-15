import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsTimeZone,
  IsLocale,
  IsDefined,
  Length,
} from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({
    description: 'Unique language code acting as ID',
    example: 'de-DE',
  })
  @IsLocale() // Validates format like xx-XX
  @IsDefined()
  @Length(5, 5) // Ensure xx-XX format
  languageCode: string; // Now serves as the ID

  @ApiProperty({ description: 'Name of the region', example: 'Germany' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'languageCode of the parent region (optional)',
    example: 'eu',
  })
  @IsString()
  @IsOptional()
  parentRegionId?: string; // Reference to parent languageCode

  @ApiPropertyOptional({ description: 'Time zone', example: 'Europe/Berlin' })
  @IsTimeZone()
  @IsOptional()
  timeZone?: string;

  @ApiPropertyOptional({
    description: 'Default formality level (optional)',
    example: 'Formal',
  })
  @IsString()
  @IsOptional()
  defaultFormalityLevel?: string;

  @ApiPropertyOptional({ description: 'Additional notes (optional)' })
  @IsString()
  @IsOptional()
  notes?: string;

  // Las relaciones como culturalData, etc.,
  // usualmente no se incluyen directamente en el DTO de creación,
  // se manejan por separado o a través de IDs anidados si es necesario.
}
