import { ApiProperty } from '@nestjs/swagger';

export class ProjectDto {
    @ApiProperty({
        description: 'Unique identifier for the project',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Name of the project',
        example: 'My Project'
    })
    name: string;

    @ApiProperty({
        description: 'Optional description of the project',
        example: 'A project for managing content',
        required: false
    })
    description?: string;

    @ApiProperty({
        description: 'ID of the tenant this project belongs to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    tenantId: string;

    @ApiProperty({
        description: 'ID of the user who owns this project',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    ownerUserId: string;

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