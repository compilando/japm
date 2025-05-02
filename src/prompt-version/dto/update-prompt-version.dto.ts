import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePromptVersionDto } from '../../prompt/dto/create-prompt-version.dto';

// Permitir actualizar solo algunos campos. Excluimos versionTag, ya que no debería cambiarse.
// promptId no existe en la clase base importada, así que no se omite.
export class UpdatePromptVersionDto extends PartialType(
    OmitType(CreatePromptVersionDto, ['versionTag'] as const)
) { }
