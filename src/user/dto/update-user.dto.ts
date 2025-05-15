import { PartialType } from '@nestjs/mapped-types'; // Usar mapped-types para PartialType
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
