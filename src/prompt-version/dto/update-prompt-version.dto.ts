import { PartialType } from '@nestjs/swagger';
import { CreatePromptVersionDto } from '../../prompt/dto/create-prompt-version.dto';

// Permitir actualizar solo algunos campos.
// versionTag no está en CreatePromptVersionDto, así que no se puede omitir de allí.
// promptId tampoco está en la clase base importada.
export class UpdatePromptVersionDto extends PartialType(
  CreatePromptVersionDto,
) {}
