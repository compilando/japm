import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({
    description: 'The new name of the tenant.',
    example: 'Acme Corp Innovations',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Set if marketplace prompt versions require approval for this tenant.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  marketplaceRequiresApproval?: boolean;
}
