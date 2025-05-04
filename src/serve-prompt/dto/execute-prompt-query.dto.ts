import { IsOptional, IsString } from 'class-validator';

export class ExecutePromptQueryDto {
  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  environmentName?: string; // Nota: La lógica para usar environmentName necesita implementación
} 