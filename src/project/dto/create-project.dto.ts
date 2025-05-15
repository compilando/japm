import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Name of the project',
    example: 'My Awesome Project',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description for the project',
    example: 'A project to demonstrate NestJS and Prisma',
  })
  @IsString()
  @IsOptional()
  description?: string;

  /* // ownerUserId should come from the authenticated user (req.user.userId)
    @ApiProperty({ description: 'ID (CUID) of the User who owns this project', example: 'user-cuid-xxxx' })
    @IsString()
    @IsNotEmpty()
    owner: string;
    */

  /* // tenantId should come from the authenticated user (req.user.tenantId)
    @ApiProperty({ description: 'ID del tenant al que pertenece este proyecto', example: 'tenant-cuid-xxxx' })
    @IsString()
    @IsNotEmpty()
    tenantId: string;
    */
}
