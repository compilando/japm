import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class TestPromptDto {
  @ApiProperty({
    description: 'Key-value context variables to replace in the prompt.',
    type: Object,
    example: { customer_name: 'ACME Corp', location: 'Madrid' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  contextVariables?: Record<string, any>;
}
