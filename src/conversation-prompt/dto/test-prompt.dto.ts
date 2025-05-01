import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class TestPromptDto {
    @ApiProperty({
        description: 'Variables de contexto clave-valor para reemplazar en el prompt.',
        type: Object,
        example: { customer_name: 'ACME Corp', location: 'Madrid' },
        required: false
    })
    @IsObject()
    @IsOptional()
    contextVariables?: Record<string, any>;
} 