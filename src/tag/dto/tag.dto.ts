import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TagDto {
  @ApiProperty({
    description: 'Unique ID of the tag (CUID)',
    example: 'clxrb8rnr0000k4yl9k5l3w1e',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Unique tag name within the project',
    example: 'customer_feedback',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the tag',
    example: 'Tags related to customer feedback.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'ID of the project this tag belongs to (CUID)',
    example: 'clxrb7t8h0000k4ylbafh4n6y',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  // Añade aquí otros campos de la entidad Tag si son necesarios, como createdAt, updatedAt
  /*
    @ApiProperty({ description: 'Timestamp of tag creation' })
    createdAt: Date;

    @ApiProperty({ description: 'Timestamp of last tag update' })
    updatedAt: Date;
    */
}
