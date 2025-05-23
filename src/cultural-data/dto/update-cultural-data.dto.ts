import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCulturalDataDto } from './create-cultural-data.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Omits 'key' and 'regionId' from CreateCulturalDataDto and makes the rest optional
export class UpdateCulturalDataDto extends PartialType(
  OmitType(CreateCulturalDataDto, ['key', 'regionId'] as const),
) {
  @ApiPropertyOptional({ description: 'The key identifier for the cultural data' })
  key?: string;

  @ApiPropertyOptional({ description: 'The style of communication' })
  style?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;
}
