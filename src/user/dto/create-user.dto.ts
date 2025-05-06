import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'John Doe', description: 'User\'s name' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'john.doe@example.com', description: 'Unique user email' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', description: 'User\'s password', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;
} 