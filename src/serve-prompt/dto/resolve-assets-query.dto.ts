import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResolveAssetsQueryDto {
  @ApiPropertyOptional({
    description:
      'Whether to resolve asset placeholders in the prompt text. Defaults to false if not provided.',
    type: Boolean,
    example: 'true', // Sent as string in query
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  resolveAssets?: boolean;

  @ApiPropertyOptional({
    description:
      'Environment ID for context, if applicable to asset or variable resolution. Not directly used for asset *version* selection in the current asset logic (which uses asset versionTag or "active" status).',
    example: 'dev-env-123',
  })
  @IsOptional()
  @IsString()
  environmentId?: string;

  @ApiPropertyOptional({
    description:
      'Region code for context, used for selecting appropriately translated assets if available.',
    example: 'us-east-1',
  })
  @IsOptional()
  @IsString()
  regionCode?: string; // Will be used as languageCode for asset translation if resolveAssets is true

  @ApiPropertyOptional({
    description:
      'JSON stringified object of variables to be substituted in the prompt. Placeholders matching keys in this object will be treated as variables, not assets.',
    example: '{"customerName": "Acme Corp", "productFeature": "new UI"}',
  })
  @IsOptional()
  @IsString()
  variables?: string; // JSON string for Record<string, any>, needs parsing

  @ApiPropertyOptional({
    description: 'Whether to return the processed prompt with all references and variables resolved. Defaults to false.',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  processed?: boolean;
}
