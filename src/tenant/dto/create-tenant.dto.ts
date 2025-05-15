import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTenantAdminUserDto {
  @ApiProperty({
    description: 'Email for the initial tenant admin user.',
    example: 'admin@acme.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the initial tenant admin user.',
    example: 'Str0ngP@sswOrd!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Name for the initial tenant admin user.',
    example: 'Admin User',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateTenantDto {
  @ApiProperty({
    description: 'The name of the tenant.',
    example: 'Acme Corporation',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Indicates if marketplace prompt versions require approval for this tenant. Defaults to true.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  marketplaceRequiresApproval?: boolean;

  @ApiProperty({
    description: 'Details for creating an initial admin user for this tenant.',
    type: CreateTenantAdminUserDto,
  })
  @ValidateNested()
  @Type(() => CreateTenantAdminUserDto)
  initialAdminUser: CreateTenantAdminUserDto;
}
