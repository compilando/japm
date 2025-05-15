import { PartialType } from '@nestjs/swagger';
import { CreateEnvironmentDto } from './create-environment.dto';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// PartialType inherits validations and ApiProperty from CreateEnvironmentDto,
// but makes all fields optional.
export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {
  // We could add specific validations for the update if necessary.
  // For example, if we wanted the name to be unchangeable once created,
  // we could remove it from this DTO or add validation to prevent it.

  // We override properties if we need to change the description or examples in Swagger
  @ApiProperty({
    description: 'New unique name for the environment (optional)',
    example: 'staging',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'New optional description for the environment',
    example: 'Pre-production testing environment',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
