import { PartialType } from '@nestjs/swagger'; // Use swagger's PartialType for proper metadata
import { CreateSystemPromptDto } from './create-system-prompt.dto';

export class UpdateSystemPromptDto extends PartialType(CreateSystemPromptDto) {}
