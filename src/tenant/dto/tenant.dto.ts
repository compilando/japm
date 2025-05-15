import { ApiProperty } from '@nestjs/swagger';

export class TenantDto {
  @ApiProperty({
    description: 'The unique identifier of the tenant.',
    example: 'clxrbspgy0000u0fwh8zgy17u',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the tenant.',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description:
      'Indicates if marketplace prompt versions require approval for this tenant.',
    example: true,
  })
  marketplaceRequiresApproval: boolean;

  @ApiProperty({
    description: 'The date and time the tenant was created.',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time the tenant was last updated.',
    example: '2024-01-02T15:30:00.000Z',
  })
  updatedAt: Date;
}
