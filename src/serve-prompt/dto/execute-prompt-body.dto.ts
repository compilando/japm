import { IsObject } from 'class-validator';

export class ExecutePromptBodyDto {
  @IsObject()
  variables: Record<string, any>;
}
