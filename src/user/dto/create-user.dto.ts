import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'John Doe', description: 'Nombre del usuario' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'john.doe@example.com', description: 'Email único del usuario' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', description: 'Contraseña del usuario', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;
} 