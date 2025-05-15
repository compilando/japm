import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PromptMetaDto {
  @ApiProperty({
    description: 'Suggested name for the prompt.',
    example: 'Invoice Details Extractor',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Suggested description for the prompt.',
    example:
      'Extracts invoice number, date, and total amount from invoice documents.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}

export class PromptVersionTranslationDto {
  @ApiProperty({
    description: 'Language code for the translation.',
    example: 'en-US',
  })
  @IsNotEmpty()
  @IsString()
  languageCode: string;

  @ApiProperty({
    description:
      'Translated prompt text, potentially including {{asset_key}} placeholders.',
    example: 'Review this invoice and extract the {{invoice_number_field}}.',
  })
  @IsNotEmpty()
  @IsString()
  promptText: string;
}

export class PromptVersionStructureDto {
  @ApiProperty({
    description:
      'Core prompt text, potentially including {{asset_key}} placeholders.',
    example:
      'Extract the {{invoice_number_field}} and the {{total_amount_field}} from the attached invoice.',
  })
  @IsNotEmpty()
  @IsString()
  promptText: string;

  @ApiProperty({
    description: 'Change message for this version.',
    example: 'Initial structure generated from user prompt.',
  })
  @IsNotEmpty()
  @IsString()
  changeMessage: string;

  @ApiProperty({
    description:
      'Array of asset keys (slug-case) used in this prompt version. These keys must correspond to assets defined in the main "assets" list.',
    example: ['invoice_number_field', 'total_amount_field'],
  })
  @IsArray()
  @IsString({ each: true })
  assets: string[]; // Array of asset keys

  @ApiProperty({
    type: [PromptVersionTranslationDto],
    description: 'Translations for the prompt text.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptVersionTranslationDto)
  translations: PromptVersionTranslationDto[];
}

export class AssetTranslationStructureDto {
  @ApiProperty({
    description: 'Language code for the asset value translation.',
    example: 'en-US',
  })
  @IsNotEmpty()
  @IsString()
  languageCode: string;

  @ApiProperty({
    description: 'Translated value of the asset.',
    example: 'Invoice Number',
  })
  @IsNotEmpty()
  @IsString()
  value: string;
}

export class PromptAssetStructureDto {
  @ApiProperty({
    description:
      'Unique key for the asset in slug-case format. This key is used in {{placeholders}}.',
    example: 'invoice-number-field',
  })
  @IsNotEmpty()
  @IsString()
  // Aquí podríamos añadir @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) si queremos validar el formato slug-case
  key: string;

  @ApiProperty({
    description: 'Descriptive name for the asset.',
    example: 'Invoice Number Field',
  })
  @IsNotEmpty()
  @IsString()
  name: string; // Nombre descriptivo del asset, como se discutió

  @ApiProperty({
    description: 'The original extracted value for the asset.',
    example: 'invoice number',
  })
  @IsNotEmpty()
  @IsString()
  value: string; // Valor base/inicial del asset

  @ApiProperty({
    description: 'Change message for this asset version.',
    example: 'Initial asset version from user prompt.',
  })
  @IsNotEmpty()
  @IsString()
  changeMessage: string;

  @ApiProperty({
    type: [AssetTranslationStructureDto],
    description: 'Translations for the asset value.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetTranslationStructureDto)
  translations: AssetTranslationStructureDto[];
}

export class LoadPromptStructureDto {
  @ApiProperty({
    type: PromptMetaDto,
    description: 'Metadata for the prompt to be created.',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PromptMetaDto)
  @IsObject() // Asegura que 'prompt' sea un objeto
  prompt: PromptMetaDto;

  @ApiProperty({
    type: PromptVersionStructureDto,
    description: 'Structure for the initial prompt version.',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PromptVersionStructureDto)
  @IsObject() // Asegura que 'version' sea un objeto
  version: PromptVersionStructureDto;

  @ApiProperty({
    type: [PromptAssetStructureDto],
    description:
      'List of assets to be created and associated with the prompt (conceptually via placeholders).',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptAssetStructureDto)
  assets: PromptAssetStructureDto[];

  @ApiProperty({
    description: 'Optional list of tag names to associate with the prompt.',
    example: ['invoicing', 'extraction'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
