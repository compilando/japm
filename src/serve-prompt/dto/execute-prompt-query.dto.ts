import { IsOptional, IsString } from 'class-validator';

export class ExecutePromptQueryDto {
  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  environmentName?: string; // Note: Logic to use environmentName needs implementation
}
