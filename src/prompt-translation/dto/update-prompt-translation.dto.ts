import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromptTranslationDto } from './create-prompt-translation.dto';

// Permite actualizar solo promptText
export class UpdatePromptTranslationDto extends PartialType(
    OmitType(CreatePromptTranslationDto, ['versionId', 'languageCode'] as const)
) { }
