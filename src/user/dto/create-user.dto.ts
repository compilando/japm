import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'John Doe', description: "User's name" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Unique user email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: "User's password",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Role of the user',
    enum: Role,
    default: Role.user,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /* // tenantId should come from the authenticated admin user (req.user.tenantId)
    @ApiProperty({ example: 'tenant-cuid-xxxx', description: 'ID del tenant al que pertenece este usuario' })
    @IsString()
    tenantId: string;
    */
}
