import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAssetTranslationDto } from './create-asset-translation.dto';

// Permite actualizar solo value
export class UpdateAssetTranslationDto extends PartialType(
  OmitType(CreateAssetTranslationDto, ['versionId', 'languageCode'] as const),
) {}
