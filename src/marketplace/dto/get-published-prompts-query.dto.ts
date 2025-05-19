import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPublishedPromptsQueryDto {
    @ApiProperty({
        description: 'Search term to filter prompts by name or description',
        required: false,
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        description: 'Page number for pagination (starts at 1)',
        required: false,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @ApiProperty({
        description: 'Number of items per page',
        required: false,
        default: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;

    @ApiProperty({
        description: 'Field to sort by (e.g. name, createdAt)',
        required: false,
        default: 'createdAt',
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiProperty({
        description: 'Sort order direction',
        required: false,
        enum: ['ASC', 'DESC'],
        default: 'DESC',
    })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC';

    @ApiProperty({
        description: 'Language code to filter prompts (e.g., en-US, es-ES)',
        required: false,
        example: 'en-US'
    })
    @IsOptional()
    @IsString()
    languageCode?: string;
} 