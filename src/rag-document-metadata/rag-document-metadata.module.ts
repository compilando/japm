import { Module } from '@nestjs/common';
import { RagDocumentMetadataService } from './rag-document-metadata.service';
import { RagDocumentMetadataController } from './rag-document-metadata.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RagDocumentMetadataController],
  providers: [RagDocumentMetadataService],
})
export class RagDocumentMetadataModule {}
