import { PartialType } from '@nestjs/mapped-types';
import { CreateRagDocumentMetadataDto } from './create-rag-document-metadata.dto';

export class UpdateRagDocumentMetadataDto extends PartialType(
  CreateRagDocumentMetadataDto,
) {}
