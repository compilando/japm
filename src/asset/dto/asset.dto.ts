import { ApiProperty } from '@nestjs/swagger';

export class AssetDto {
    @ApiProperty({
        description: 'Unique identifier of the asset',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Name of the asset',
        example: 'My Asset'
    })
    name: string;

    @ApiProperty({
        description: 'Description of the asset',
        example: 'A detailed description of the asset',
        nullable: true
    })
    description: string | null;

    @ApiProperty({
        description: 'Type of the asset',
        example: 'image'
    })
    type: string;

    @ApiProperty({
        description: 'URL of the asset',
        example: 'https://example.com/assets/image.jpg'
    })
    url: string;

    @ApiProperty({
        description: 'ID of the tenant this asset belongs to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    tenantId: string;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2024-01-01T00:00:00Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2024-01-01T00:00:00Z'
    })
    updatedAt: Date;
} 