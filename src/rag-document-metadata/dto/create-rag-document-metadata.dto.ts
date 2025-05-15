import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateRagDocumentMetadataDto {
  @ApiProperty({
    description: 'ID de la región asociada (opcional)',
    required: false,
  })
  @IsUUID() // Asumiendo CUID/UUID
  @IsOptional()
  regionId?: string;

  @ApiProperty({
    description: 'Nombre del documento RAG',
    example: 'policy_update_q1_2024.pdf',
  })
  @IsString()
  documentName: string;

  @ApiProperty({
    description: 'Categoría (opcional)',
    example: 'Compliance',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Indica si ha sido revisado por compliance',
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  complianceReviewed?: boolean;

  @ApiProperty({
    description:
      'Nivel de riesgo PII (Información Personal Identificable) (opcional)',
    example: 'Low',
    required: false,
  })
  @IsString()
  @IsOptional()
  piiRiskLevel?: string;

  @ApiProperty({
    description: 'Identificador de quién lo revisó por última vez (opcional)',
    example: 'user_cuid_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastReviewedBy?: string;
}
