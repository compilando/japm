import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCulturalDataDto } from './create-cultural-data.dto';

// Omite 'id' y 'regionId' de CreateCulturalDataDto y hace el resto opcional
export class UpdateCulturalDataDto extends PartialType(
    OmitType(CreateCulturalDataDto, ['id', 'regionId'] as const)
) { } 