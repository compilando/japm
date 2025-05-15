import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExecutePromptParamsDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  promptName: string;

  @IsString()
  @IsNotEmpty()
  versionTag: string;

  @IsString()
  @IsOptional()
  languageCode?: string;
}
