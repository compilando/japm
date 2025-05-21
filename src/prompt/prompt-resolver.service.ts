import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServePromptService } from '../serve-prompt/serve-prompt.service';

@Injectable()
export class PromptResolverService {
  private readonly logger = new Logger(PromptResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly servePromptService: ServePromptService,
  ) {}

  /**
   * Resuelve un prompt y todas sus referencias de forma recursiva
   * @param projectId ID del proyecto
   * @param promptId ID del prompt a resolver
   * @param versionTag Versión del prompt (opcional, por defecto 'latest')
   * @param languageCode Código de idioma (opcional)
   * @param variables Variables para sustituir en el prompt
   * @param processedPrompts Set de prompts ya procesados para evitar referencias circulares
   * @returns El prompt resuelto con todas sus referencias
   */
  async resolvePrompt(
    projectId: string,
    promptId: string,
    versionTag: string = 'latest',
    languageCode?: string,
    variables: Record<string, any> = {},
    processedPrompts: Set<string> = new Set(),
  ): Promise<{
    resolvedText: string;
    metadata: {
      promptId: string;
      versionTag: string;
      languageCode?: string;
      resolvedPrompts: string[];
      variables: string[];
    };
  }> {
    this.logger.debug(
      `Resolving prompt ${promptId} (version: ${versionTag}, language: ${languageCode}) in project ${projectId}`,
    );

    if (processedPrompts.has(promptId)) {
      this.logger.warn(
        `Circular reference detected for prompt ${promptId}. Skipping.`,
      );
      return {
        resolvedText: `[Circular reference to ${promptId}]`,
        metadata: {
          promptId,
          versionTag,
          languageCode,
          resolvedPrompts: [],
          variables: [],
        },
      };
    }

    processedPrompts.add(promptId);

    try {
      const { processedPrompt, metadata } = await this.servePromptService.executePromptVersion(
        {
          projectId,
          promptName: promptId,
          versionTag,
          languageCode,
        },
        { variables },
      );

      return {
        resolvedText: processedPrompt,
        metadata: {
          promptId,
          versionTag,
          languageCode,
          resolvedPrompts: metadata.resolvedPrompts?.map(p => p.promptName) || [],
          variables: metadata.variablesProvided || [],
        },
      };
    } catch (error) {
      this.logger.error(
        `Error resolving prompt ${promptId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
} 