import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  Prompt,
  PromptVersion,
  PromptAssetVersion,
  PromptTranslation,
  AssetTranslation,
  Environment,
  CulturalData,
} from '@prisma/client';
// import { TemplateService } from '../template/template.service'; // Temporarily commented out
import { ExecutePromptParamsDto } from './dto/execute-prompt-params.dto';
import { ExecutePromptQueryDto } from './dto/execute-prompt-query.dto';
import { ExecutePromptBodyDto } from './dto/execute-prompt-body.dto';

// Definición de la función slugify (copiada de prompt.service.ts)
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD') // Normalize to decompose combined graphemes
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars (keeps hyphen)
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

@Injectable()
export class ServePromptService {
  private readonly logger = new Logger(ServePromptService.name);

  constructor(
    private prisma: PrismaService,
    // private templateService: TemplateService // Temporarily commented out
  ) { }

  /**
   * Resolves asset placeholders in a given text.
   * @param text The text containing potential asset placeholders.
   * @param promptIdInput The ID of the prompt to scope asset search.
   * @param projectIdInput The ID of the project to scope asset search.
   * @param languageCode Optional language code for asset translation.
   * @param inputVariables Optional map of variables to distinguish from assets.
   * @param promptContext Optional prompt context for better logging
   * @returns An object containing the processed text and metadata about resolved assets.
   */
  async resolveAssets(
    text: string,
    promptIdInput: string,
    projectIdInput: string,
    languageCode?: string,
    inputVariables: Record<string, any> = {},
  ): Promise<{ processedText: string; resolvedAssetsMetadata: any[] }> {
    this.logger.debug(
      `Resolving assets for prompt "${promptIdInput}" (project: "${projectIdInput}")${languageCode ? ` with language "${languageCode}"` : ''}`,
    );
    const potentialPlaceholders = [...text.matchAll(/\{\{([^}]+)\}\}/g)];

    const assetSpecifications = potentialPlaceholders
      .map((match) => {
        const placeholderContent = match[1].trim();
        const parts = placeholderContent.split(':');
        const type = parts[0];
        const key = parts[1];
        const versionTag = parts.length > 2 ? parts[2] : undefined;
        return { placeholderContent, type, key, versionTag };
      })
      .filter(
        (spec) =>
          spec.type === 'asset' && // Solo procesar assets aquí
          !inputVariables.hasOwnProperty(spec.key) &&
          !inputVariables.hasOwnProperty(spec.placeholderContent),
      );

    const assetContext: Record<string, string> = {};
    const resolvedAssetsMetadata: any[] = [];

    if (assetSpecifications.length > 0) {
      const uniqueAssetKeys = [
        ...new Set(assetSpecifications.map((spec) => spec.key)),
      ];
      this.logger.debug(
        `Potential asset keys to resolve from text: ${uniqueAssetKeys.join(', ')} after filtering against input variables.`,
      );

      const foundAssets = await this.prisma.promptAsset.findMany({
        where: {
          promptId: promptIdInput,
          projectId: projectIdInput,
          key: { in: uniqueAssetKeys },
        },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            include: { translations: true },
          },
        },
      });

      this.logger.debug(
        `Found ${foundAssets.length} asset(s) in DB for prompt "${promptIdInput}" (project: "${projectIdInput}") matching keys: [${uniqueAssetKeys.join(', ')}]`,
      );

      for (const asset of foundAssets) {
        if (asset.versions && asset.versions.length > 0) {
          const latestVersion = asset.versions[0];
          this.logger.debug(
            `  - Asset Key: "${asset.key}" (for prompt "${promptIdInput}"), ` +
            `Latest Version ID: "${latestVersion.id}", ` +
            `Tag: "${latestVersion.versionTag}", ` +
            `Status: "${latestVersion.status}", ` +
            `Value: "${latestVersion.value.substring(0, 50)}${latestVersion.value.length > 50 ? '...' : ''}", ` +
            `Translations: ${latestVersion.translations.length > 0 ? latestVersion.translations.map((t) => t.languageCode).join(', ') : 'none'}`,
          );
        } else {
          this.logger.debug(
            `  - Asset Key: "${asset.key}" (No versions found)`,
          );
        }
      }

      for (const spec of assetSpecifications) {
        const asset = foundAssets.find((a) => a.key === spec.key);
        if (!asset) {
          this.logger.warn(
            `Asset with key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") not found for prompt "${promptIdInput}" in project "${projectIdInput}".`,
          );
          continue;
        }

        const assetVersions =
          asset.versions as Prisma.PromptAssetVersionGetPayload<{
            include: { translations: true };
          }>[];
        if (!assetVersions) {
          this.logger.warn(
            `Asset key "${spec.key}" for prompt "${promptIdInput}" found, but versions array is unexpectedly undefined.`,
          );
          continue;
        }

        let targetVersion:
          | Prisma.PromptAssetVersionGetPayload<{
            include: { translations: true };
          }>
          | undefined = undefined;

        if (spec.versionTag) {
          targetVersion = assetVersions.find(
            (v) => v.versionTag === spec.versionTag,
          );
          if (!targetVersion) {
            this.logger.warn(
              `Asset key "${spec.key}", version "${spec.versionTag}" (referenced as "{{${spec.placeholderContent}}}") not found. Falling back to latest active version.`,
            );
          }
        }

        if (!targetVersion) {
          targetVersion = assetVersions.find((v) => v.status === 'active');
        }

        if (targetVersion) {
          let assetValue = targetVersion.value;
          let languageSource = 'base_asset';

          if (languageCode) {
            const translation = targetVersion.translations.find(
              (t) => t.languageCode === languageCode,
            );
            if (translation) {
              assetValue = translation.value;
              languageSource = languageCode;
            } else {
              this.logger.warn(
                `Asset key "${spec.key}" v${targetVersion.versionTag} (referenced as "{{${spec.placeholderContent}}}"): No translation found for "${languageCode}". Using base value.`,
              );
              languageSource = 'base_asset_fallback';
            }
          }

          assetContext[spec.placeholderContent] = assetValue;
          resolvedAssetsMetadata.push({
            key: asset.key,
            placeholderUsed: spec.placeholderContent,
            versionId: targetVersion.id,
            versionTag: targetVersion.versionTag,
            languageUsed: languageSource,
          });
        } else {
          this.logger.warn(
            `Asset key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") for prompt "${promptIdInput}" (project "${projectIdInput}") found, but no suitable version (specified: ${spec.versionTag || 'any active'}) could be resolved.`,
          );
        }
      }
    }

    // Procesar variables con la nueva sintaxis
    const variableContext: Record<string, string> = {};
    const variablePlaceholders = [...text.matchAll(/\{\{variable:([^}]+)\}\}/g)];

    for (const match of variablePlaceholders) {
      const placeholderContent = match[1].trim();
      const variableName = placeholderContent.split(':')[0];

      if (inputVariables.hasOwnProperty(variableName)) {
        variableContext[`variable:${placeholderContent}`] = String(inputVariables[variableName]);
      } else {
        this.logger.warn(
          `Variable "${variableName}" (referenced as "{{variable:${placeholderContent}}}") not found in provided variables.`,
        );
      }
    }

    const finalContext = { ...assetContext, ...variableContext };
    let processedText: string;
    try {
      processedText = text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        if (finalContext.hasOwnProperty(trimmedKey)) {
          return String(finalContext[trimmedKey]);
        }
        this.logger.warn(
          `Placeholder {{${trimmedKey}}} not found in provided variables or resolved assets.`,
        );
        return match;
      });
    } catch (error) {
      this.logger.error('Error during placeholder substitution:', error);
      throw new BadRequestException(
        `Failed to substitute placeholders: ${error.message}`,
      );
    }

    return { processedText, resolvedAssetsMetadata };
  }

  /**
   * Resolves prompt references in a given text.
   * @param text The text containing potential prompt references.
   * @param projectId The ID of the project to scope prompt search.
   * @param languageCode Optional language code for prompt translation.
   * @param processedPrompts Set of already processed prompts to prevent circular references.
   * @param context Additional context for prompt resolution
   * @returns An object containing the processed text and metadata about resolved prompts.
   */
  private async resolvePromptReferences(
    text: string,
    projectId: string,
    languageCode?: string,
    processedPrompts: Set<string> = new Set(),
    context: {
      currentPromptType?: string;
      maxDepth?: number;
      currentDepth?: number;
    } = {},
  ): Promise<{ processedText: string; resolvedPromptsMetadata: any[] }> {
    const { currentPromptType, maxDepth = 5, currentDepth = 0 } = context;

    if (currentDepth >= maxDepth) {
      this.logger.warn(
        `Maximum prompt reference depth (${maxDepth}) reached. Stopping resolution.`,
      );
      return { processedText: text, resolvedPromptsMetadata: [] };
    }

    this.logger.debug(
      `Resolving prompt references for project "${projectId}"${languageCode ? ` with language "${languageCode}"` : ''} (depth: ${currentDepth})`,
    );

    const promptReferences = [...text.matchAll(/\{\{prompt:([^}]+)\}\}/g)];
    const resolvedPromptsMetadata: any[] = [];

    if (promptReferences.length === 0) {
      return { processedText: text, resolvedPromptsMetadata };
    }

    let processedText = text;

    for (const match of promptReferences) {
      const fullMatch = match[0];
      const referenceContent = match[1].trim();
      const [promptName, versionTag, refLanguageCode] = referenceContent.split(':');

      if (processedPrompts.has(promptName)) {
        this.logger.warn(
          `Circular reference detected for prompt "${promptName}". Skipping.`,
        );
        continue;
      }

      const promptNameSlug = slugify(promptName);
      const targetLanguageCode = refLanguageCode || languageCode;

      try {
        // Obtener el prompt referenciado para validar su tipo
        const referencedPrompt = await this.prisma.prompt.findUnique({
          where: {
            prompt_id_project_unique: {
              id: promptNameSlug,
              projectId,
            },
          },
          select: {
            id: true,
            name: true,
            type: true,
          },
        });

        if (!referencedPrompt) {
          throw new NotFoundException(
            `Referenced prompt "${promptName}" not found in project "${projectId}".`,
          );
        }

        // Validaciones específicas por tipo de prompt
        if (currentPromptType === 'GUARD' && referencedPrompt.type !== 'GUARD') {
          throw new BadRequestException(
            `Guard prompts can only reference other guard prompts. Attempted to reference "${promptName}" of type ${referencedPrompt.type}.`,
          );
        }

        if (currentPromptType === 'SYSTEM' && referencedPrompt.type === 'USER') {
          throw new BadRequestException(
            `System prompts cannot reference user prompts. Attempted to reference "${promptName}".`,
          );
        }

        const { processedPrompt, metadata } = await this.executePromptVersion(
          {
            projectId,
            promptName: promptName,
            versionTag: versionTag || 'latest',
            languageCode: targetLanguageCode,
          },
          { variables: {} },
        );

        processedText = processedText.replace(fullMatch, processedPrompt);
        resolvedPromptsMetadata.push({
          promptName,
          versionTag: versionTag || 'latest',
          languageUsed: targetLanguageCode,
          promptType: referencedPrompt.type,
          metadata,
        });

        processedPrompts.add(promptName);
      } catch (error) {
        this.logger.warn(
          `Failed to resolve prompt reference "${fullMatch}": ${error.message}`,
        );
      }
    }

    return { processedText, resolvedPromptsMetadata };
  }

  /**
   * Executes a specific prompt version with given variables.
   * Handles translation, asset substitution, and prompt references.
   * @returns The processed prompt text ready for execution.
   */
  async executePromptVersion(
    params: ExecutePromptParamsDto,
    body: ExecutePromptBodyDto,
  ): Promise<{ processedPrompt: string; metadata: any }> {
    const { projectId, promptName, versionTag, languageCode } = params;
    const { variables } = body;

    const promptNameSlug = slugify(promptName);
    const currentProjectId = projectId;

    const prompt = await this.prisma.prompt.findUnique({
      where: {
        prompt_id_project_unique: {
          id: promptNameSlug,
          projectId: currentProjectId,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        projectId: true,
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt "${promptName}" (slug: "${promptNameSlug}") not found in project "${currentProjectId}".`,
      );
    }

    // Validaciones específicas por tipo de prompt
    if (prompt.type === 'GUARD' && Object.keys(variables || {}).length > 0) {
      throw new BadRequestException(
        'Guard prompts cannot accept variables for security reasons.',
      );
    }

    let versionToUse;
    if (versionTag === 'latest') {
      versionToUse = await this.prisma.promptVersion.findFirst({
        where: {
          promptId: prompt.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: { prompt: true, translations: true },
      });

      if (!versionToUse) {
        throw new NotFoundException(
          `No versions found for prompt "${promptName}" (ID: ${prompt.id}) in project "${currentProjectId}".`,
        );
      }
    } else {
      versionToUse = await this.prisma.promptVersion.findUnique({
        where: {
          promptId_versionTag: { promptId: prompt.id, versionTag },
        },
        include: { prompt: true, translations: true },
      });

      if (!versionToUse) {
        throw new NotFoundException(
          `Version "${versionTag}" for prompt "${promptName}" (ID: ${prompt.id}) in project "${currentProjectId}" not found.`,
        );
      }
    }

    const finalLanguageCode = languageCode;
    let basePromptText = versionToUse.promptText;

    if (finalLanguageCode) {
      const promptTranslation = versionToUse.translations.find(
        (t) => t.languageCode === finalLanguageCode,
      );
      if (promptTranslation) {
        basePromptText = promptTranslation.promptText;
      } else {
        this.logger.warn(
          `Translation for languageCode "${finalLanguageCode}" not found for prompt "${promptName}" v${versionTag}. Falling back to base text.`,
        );
      }
    }

    // First resolve prompt references
    const { processedText: textWithResolvedPrompts, resolvedPromptsMetadata } =
      await this.resolvePromptReferences(
        basePromptText,
        prompt.projectId,
        finalLanguageCode,
        new Set([promptNameSlug]),
        {
          currentPromptType: prompt.type,
          currentDepth: 0,
        },
      );

    // Then resolve assets and variables
    const { processedText, resolvedAssetsMetadata } = await this.resolveAssets(
      textWithResolvedPrompts,
      prompt.id,
      prompt.projectId,
      finalLanguageCode,
      variables,
    );

    const metadata = {
      projectId: currentProjectId,
      promptName: prompt.name,
      promptId: prompt.id,
      promptType: prompt.type,
      promptVersionId: versionToUse.id,
      promptVersionTag: versionToUse.versionTag,
      languageUsed: finalLanguageCode
        ? versionToUse.translations.some(
          (t) => t.languageCode === finalLanguageCode,
        )
          ? finalLanguageCode
          : 'base_language_fallback'
        : 'base_language',
      assetsUsed: resolvedAssetsMetadata,
      variablesProvided: Object.keys(variables || {}),
      resolvedPrompts: resolvedPromptsMetadata,
    };

    return { processedPrompt: processedText, metadata };
  }

  // Keep the old servePrompt method commented or remove if fully deprecated
  /*
    async servePrompt(
        promptName: string,
        languageCode: string,
        versionTag?: string,
        context?: Record<string, any>
    ): Promise<{ processedPrompt: string; metadata: any }> { ... old code ... }
    */
}

// Nota: Faltaría implementar la lógica para crear/actualizar prompts, versiones y traducciones.
// Esta función solo se encarga de servir el prompt ensamblado.
// -->
// Note: Logic for creating/updating prompts, versions, and translations would still need implementation.
// This function is only responsible for serving the assembled prompt.
