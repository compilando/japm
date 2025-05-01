import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromptAssetLinkDto } from './create-prompt-asset-link.dto';

// Permitir actualizar solo campos propios del Link, no las claves foráneas.
export class UpdatePromptAssetLinkDto extends PartialType(
    OmitType(CreatePromptAssetLinkDto, ['promptVersionId', 'assetVersionId'] as const)
) { } 