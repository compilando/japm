import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConversationPromptVersionDto } from './create-conversation-prompt-version.dto';

// Permite actualizar solo promptText y changeMessage
export class UpdateConversationPromptVersionDto extends PartialType(
    OmitType(CreateConversationPromptVersionDto, ['promptId', 'versionTag'] as const)
) { }
