import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Optional interface for typing log data
export interface PromptExecutionLogData {
  projectId: string;
  promptVersionId: string;
  input: string;
  output: string;
  success: boolean;
  durationMs?: number;
  errorMessage?: string;
  environmentId?: string;
  userId?: string;
}

@Injectable()
export class ExecutionLogService {
  constructor(private prisma: PrismaService) {}

  async logPromptExecution(data: PromptExecutionLogData): Promise<void> {
    const {
      projectId,
      promptVersionId,
      input,
      output,
      success,
      durationMs,
      errorMessage,
      environmentId,
      userId,
    } = data;

    try {
      await this.prisma.promptExecutionLog.create({
        data: {
          projectId: projectId,
          promptVersionId: promptVersionId,
          input,
          output,
          success,
          durationMs,
          errorMessage,
          environmentId: environmentId,
          userId: userId,
          // timestamp is set by default
        },
      });
    } catch (error) {
      // Handle important errors (e.g., FK not found), but do not block main execution
      console.error('Failed to log prompt execution:', {
        error: error.message,
        projectId,
        promptVersionId,
        userId,
        environmentId,
      });
      // We could throw an internal error if logging is critical,
      // but generally it's better to just log the logging failure.
      // throw new InternalServerErrorException('Failed to save execution log');
    }
  }

  // You could add methods to query logs here if needed
  // async findLogs(...) { ... }
}
