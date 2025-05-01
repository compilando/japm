import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConversationPromptAssetLinkDto } from './create-conversation-prompt-asset-link.dto';

// Para actualizar, permitimos cambiar campos como position, usageContext.
// No permitimos cambiar a qué versiones (promptVersionId, assetVersionId) apunta el link.
export class UpdateConversationPromptAssetLinkDto extends PartialType(
    // Omitir los IDs de las versiones
    OmitType(CreateConversationPromptAssetLinkDto, ['promptVersionId', 'assetVersionId'] as const)
) { } 