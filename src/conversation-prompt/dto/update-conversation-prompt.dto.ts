import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConversationPromptDto } from './create-conversation-prompt.dto';

export class UpdateConversationPromptDto extends PartialType(
    OmitType(CreateConversationPromptDto, [
        'name',
        'promptText',
        'initialTranslations'
    ] as const)
) { } 