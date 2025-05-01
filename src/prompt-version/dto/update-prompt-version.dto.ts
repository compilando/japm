import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromptVersionDto } from './create-prompt-version.dto';

// Permitir actualizar solo algunos campos. Excluimos promptId y versionTag, ya que no deberían cambiarse.
export class UpdatePromptVersionDto extends PartialType(
    OmitType(CreatePromptVersionDto, ['promptId', 'versionTag'] as const)
) { }
