import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCulturalDataDto } from './create-cultural-data.dto';

// Omits 'id' and 'regionId' from CreateCulturalDataDto and makes the rest optional
export class UpdateCulturalDataDto extends PartialType(
    OmitType(CreateCulturalDataDto, ['id', 'regionId'] as const)
) { } 