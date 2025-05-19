import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateAssetDto {
    @ApiProperty({
        description: 'Name of the asset',
        example: 'My Asset',
        required: false
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        description: 'Description of the asset',
        example: 'A detailed description of the asset',
        required: false
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Type of the asset',
        example: 'image',
        required: false
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        description: 'URL of the asset',
        example: 'https://example.com/assets/image.jpg',
        required: false
    })
    @IsOptional()
    @IsUrl()
    url?: string;
} 