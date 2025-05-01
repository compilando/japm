import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({ description: 'Name of the project', example: 'My Awesome Project' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Optional description for the project', example: 'A project to demonstrate NestJS and Prisma' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Optional ID of the User who owns this project', example: 'cl...' })
    @IsString()
    @IsOptional()
    ownerUserId?: string;
} 