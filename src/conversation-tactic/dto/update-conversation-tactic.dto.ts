import { PartialType } from '@nestjs/mapped-types';
import { CreateConversationTacticDto } from './create-conversation-tactic.dto';

export class UpdateConversationTacticDto extends PartialType(CreateConversationTacticDto) { } 