import { PartialType } from '@nestjs/mapped-types';
import { CreateConversationPromptAssetDto } from './create-conversation-prompt-asset.dto';

export class UpdateConversationPromptAssetDto extends PartialType(CreateConversationPromptAssetDto) { } 