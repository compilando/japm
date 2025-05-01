import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConversationPromptAssetVersionDto } from './create-conversation-prompt-asset-version.dto';

// Permite actualizar solo value y changeMessage
export class UpdateConversationPromptAssetVersionDto extends PartialType(
    OmitType(CreateConversationPromptAssetVersionDto, ['assetId', 'versionTag'] as const)
) { }
