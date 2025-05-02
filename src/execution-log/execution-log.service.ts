import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Interfaz opcional para tipar los datos del log
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
    constructor(private prisma: PrismaService) { }

    async logPromptExecution(data: PromptExecutionLogData): Promise<void> {
        const { projectId, promptVersionId, input, output, success, durationMs, errorMessage, environmentId, userId } = data;

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
                    // timestamp se establece por defecto
                },
            });
        } catch (error) {
            // Manejar errores importantes (ej: FK no encontrada), pero no bloquear la ejecución principal
            console.error('Failed to log prompt execution:', {
                error: error.message,
                projectId,
                promptVersionId,
                userId,
                environmentId,
            });
            // Podríamos lanzar un error interno si el loggeo es crítico,
            // pero generalmente es mejor solo registrar el fallo del log.
            // throw new InternalServerErrorException('Failed to save execution log');
        }
    }

    // Podrías añadir métodos para consultar logs aquí si es necesario
    // async findLogs(...) { ... }
} 