import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteLlmDto {
  @ApiProperty({ description: 'ID del AIModel a utilizar (de la tabla AIModel)', example: 'clxyz...' })
  @IsString()
  @IsNotEmpty()
  modelId: string;

  @ApiProperty({ description: 'El texto completo del prompt ya procesado y listo para enviar al LLM', example: 'Traduce este texto a español: Hello world.' })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  @ApiProperty({ description: 'Variables originales usadas para ensamblar el prompt (opcional, para logging/contexto)', example: { cliente: 'ACME Corp' }, required: false })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
} 