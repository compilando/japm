import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCulturalDataDto } from './create-cultural-data.dto';

// Omits 'key' and 'regionId' from CreateCulturalDataDto and makes the rest optional
export class UpdateCulturalDataDto extends PartialType(
  OmitType(CreateCulturalDataDto, ['key', 'regionId'] as const),
) {}
