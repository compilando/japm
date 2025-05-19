import { ApiProperty } from '@nestjs/swagger';

export class RegionDto {
    @ApiProperty({
        description: 'Unique identifier for the region',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Name of the region',
        example: 'United States'
    })
    name: string;

    @ApiProperty({
        description: 'Optional description of the region',
        example: 'English speaking region for North America',
        required: false
    })
    description?: string;

    @ApiProperty({
        description: 'ID of the project this region belongs to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    projectId: string;

    @ApiProperty({
        description: 'Language code for the region',
        example: 'en-US'
    })
    languageCode: string;

    @ApiProperty({
        description: 'ID of the parent region, if any',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false,
        nullable: true
    })
    parentRegionId: string | null;

    @ApiProperty({
        description: 'Time zone for the region',
        example: 'America/New_York'
    })
    timeZone: string;

    @ApiProperty({
        description: 'Default formality level for the region',
        example: 'formal',
        required: false,
        nullable: true
    })
    defaultFormalityLevel: string | null;

    @ApiProperty({
        description: 'Optional notes about the region',
        example: 'Primary region for English content',
        required: false
    })
    notes?: string;

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