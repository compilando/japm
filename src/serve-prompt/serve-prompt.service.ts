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
      `🔧 [RESOLVE ASSETS] Starting asset resolution for prompt "${promptIdInput}" in project "${projectIdInput}"${languageCode ? ` with language "${languageCode}"` : ''}`,
    );
    this.logger.debug(
      `🔧 [RESOLVE ASSETS] Input text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`,
    );
    this.logger.debug(
      `🔧 [RESOLVE ASSETS] Input variables: ${JSON.stringify(inputVariables)}`,
    );

    let processedText = text;
    const assetContext: Record<string, string> = {};
    const resolvedAssetsMetadata: any[] = [];

    // Buscar placeholders de activos, excluyendo aquellos que corresponden a variables del input
    const allAssetMatches = [...text.matchAll(/\{\{asset:([^}]+)\}\}/g)];
    this.logger.debug(
      `🔧 [RESOLVE ASSETS] Found ${allAssetMatches.length} asset placeholder(s): ${allAssetMatches.map(m => m[0]).join(', ')}`,
    );

    const assetSpecifications = allAssetMatches
      .filter((match) => {
        const placeholderContent = match[1].trim();
        const [key] = placeholderContent.split(':');
        const isVariable = inputVariables.hasOwnProperty(key);
        if (isVariable) {
          this.logger.debug(
            `🔧 [RESOLVE ASSETS] Skipping asset placeholder "${match[0]}" because "${key}" is provided as a variable`,
          );
        }
        return !isVariable;
      })
      .map((match) => {
        const placeholderContent = match[1].trim();
        const [key, versionTag] = placeholderContent.split(':');
        return { key, versionTag, placeholderContent };
      });

    this.logger.debug(
      `🔧 [RESOLVE ASSETS] After filtering variables, ${assetSpecifications.length} asset(s) to resolve: ${assetSpecifications.map(s => s.key).join(', ')}`,
    );

    if (assetSpecifications.length > 0) {
      const uniqueAssetKeys = [
        ...new Set(assetSpecifications.map((spec) => spec.key)),
      ];
      this.logger.debug(
        `🔧 [RESOLVE ASSETS] Unique asset keys to search: ${uniqueAssetKeys.join(', ')}`,
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
        `🔧 [RESOLVE ASSETS] Found ${foundAssets.length} asset(s) in database for prompt "${promptIdInput}"`,
      );

      for (const asset of foundAssets) {
        if (asset.versions && asset.versions.length > 0) {
          const latestVersion = asset.versions[0];
          this.logger.debug(
            `🔧 [RESOLVE ASSETS] Asset "${asset.key}": Latest version ID="${latestVersion.id}", tag="${latestVersion.versionTag}", status="${latestVersion.status}", translations=${latestVersion.translations.length}`,
          );
        } else {
          this.logger.debug(
            `🔧 [RESOLVE ASSETS] Asset "${asset.key}": No versions found`,
          );
        }
      }

      for (const spec of assetSpecifications) {
        const asset = foundAssets.find((a) => a.key === spec.key);
        if (!asset) {
          this.logger.warn(
            `⚠️ [RESOLVE ASSETS] Asset with key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") not found for prompt "${promptIdInput}" in project "${projectIdInput}".`,
          );
          continue;
        }

        const assetVersions = asset.versions;
        if (!assetVersions) {
          this.logger.warn(
            `⚠️ [RESOLVE ASSETS] Asset key "${spec.key}" for prompt "${promptIdInput}" found, but versions array is unexpectedly undefined.`,
          );
          continue;
        }

        let targetVersion: typeof assetVersions[0] | undefined = undefined;

        if (spec.versionTag) {
          this.logger.debug(
            `🔧 [RESOLVE ASSETS] Looking for specific version "${spec.versionTag}" for asset "${spec.key}"`,
          );
          targetVersion = assetVersions.find(
            (v) => v.versionTag === spec.versionTag,
          );
          if (!targetVersion) {
            this.logger.warn(
              `⚠️ [RESOLVE ASSETS] Asset key "${spec.key}", version "${spec.versionTag}" not found. Falling back to latest active version.`,
            );
          }
        }

        if (!targetVersion) {
          this.logger.debug(
            `🔧 [RESOLVE ASSETS] Looking for active version for asset "${spec.key}"`,
          );
          targetVersion = assetVersions.find((v) => v.status === 'active');
        }

        if (targetVersion) {
          let assetValue = targetVersion.value;
          let languageSource = 'base_asset';

          this.logger.debug(
            `✅ [RESOLVE ASSETS] Found target version for asset "${spec.key}": version="${targetVersion.versionTag}", value="${assetValue.substring(0, 100)}${assetValue.length > 100 ? '...' : ''}"`,
          );

          if (languageCode) {
            this.logger.debug(
              `🌐 [RESOLVE ASSETS] Looking for translation in language "${languageCode}" for asset "${spec.key}"`,
            );
            const translation = targetVersion.translations.find(
              (t) => t.languageCode === languageCode,
            );
            if (translation) {
              assetValue = translation.value;
              languageSource = languageCode;
              this.logger.debug(
                `✅ [RESOLVE ASSETS] Found translation for asset "${spec.key}" in "${languageCode}": "${assetValue.substring(0, 100)}${assetValue.length > 100 ? '...' : ''}"`,
              );
            } else {
              this.logger.warn(
                `⚠️ [RESOLVE ASSETS] Asset key "${spec.key}" v${targetVersion.versionTag}: No translation found for "${languageCode}". Using base value.`,
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

          this.logger.debug(
            `✅ [RESOLVE ASSETS] Asset "${spec.key}" resolved successfully. Value will replace "{{${spec.placeholderContent}}}"`,
          );
        } else {
          this.logger.warn(
            `⚠️ [RESOLVE ASSETS] Asset key "${spec.key}" for prompt "${promptIdInput}" found, but no suitable version (specified: ${spec.versionTag || 'any active'}) could be resolved.`,
          );
        }
      }
    }

    // Procesar variables con la nueva sintaxis
    const variableContext: Record<string, string> = {};
    const variablePlaceholders = [...text.matchAll(/\{\{variable:([^}]+)\}\}/g)];
    
    this.logger.debug(
      `🔧 [RESOLVE ASSETS] Found ${variablePlaceholders.length} variable placeholder(s): ${variablePlaceholders.map(m => m[0]).join(', ')}`,
    );

    for (const match of variablePlaceholders) {
      const placeholder = match[0];
      const variableName = match[1].trim();
      
      if (inputVariables.hasOwnProperty(variableName)) {
        const variableValue = String(inputVariables[variableName]);
        variableContext[variableName] = variableValue;
        this.logger.debug(
          `✅ [RESOLVE ASSETS] Variable "${variableName}" resolved: "${variableValue.substring(0, 100)}${variableValue.length > 100 ? '...' : ''}"`,
        );
      } else {
        this.logger.warn(
          `⚠️ [RESOLVE ASSETS] Variable "${variableName}" (referenced as "${placeholder}") not provided in input variables. Available variables: ${Object.keys(inputVariables).join(', ') || 'none'}`,
        );
      }
    }

    // Reemplazar assets primero
    this.logger.debug(
      `🔄 [RESOLVE ASSETS] Replacing ${Object.keys(assetContext).length} asset placeholder(s)`,
    );
    for (const [placeholderContent, assetValue] of Object.entries(assetContext)) {
      const placeholder = `{{asset:${placeholderContent}}}`;
      processedText = processedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), assetValue);
      this.logger.debug(
        `🔄 [RESOLVE ASSETS] Replaced "${placeholder}" with asset value`,
      );
    }

    // Luego reemplazar variables
    this.logger.debug(
      `🔄 [RESOLVE ASSETS] Replacing ${Object.keys(variableContext).length} variable placeholder(s)`,
    );
    for (const [variableName, variableValue] of Object.entries(variableContext)) {
      const placeholder = `{{variable:${variableName}}}`;
      processedText = processedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), variableValue);
      this.logger.debug(
        `🔄 [RESOLVE ASSETS] Replaced "${placeholder}" with variable value`,
      );
    }

    this.logger.debug(
      `🎯 [RESOLVE ASSETS] Asset and variable resolution completed. Final text: "${processedText.substring(0, 200)}${processedText.length > 200 ? '...' : ''}"`,
    );
    this.logger.debug(
      `📊 [RESOLVE ASSETS] Summary - Assets resolved: ${resolvedAssetsMetadata.length}, Variables resolved: ${Object.keys(variableContext).length}`,
    );

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

    // 🔥🔥🔥 CRITICAL DEBUG LOG - This should appear every time 🔥🔥🔥
    console.log(`🔥🔥🔥 [CRITICAL DEBUG] resolvePromptReferences called! Depth: ${currentDepth}, Text preview: "${text.substring(0, 100)}", Project: "${projectId}"`);

    if (currentDepth >= maxDepth) {
      this.logger.warn(
        `Maximum prompt reference depth (${maxDepth}) reached. Stopping resolution.`,
      );
      return { processedText: text, resolvedPromptsMetadata: [] };
    }

    this.logger.debug(
      `🔍 [PROMPT RESOLUTION] Starting to resolve prompt references for project "${projectId}"${languageCode ? ` with language "${languageCode}"` : ''} (depth: ${currentDepth})`,
    );
    this.logger.debug(
      `🔍 [PROMPT RESOLUTION] Input text to process: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`,
    );

    const promptReferences = [...text.matchAll(/\{\{prompt:([^}]+)\}\}/g)];
    const resolvedPromptsMetadata: any[] = [];

    this.logger.debug(
      `🔍 [PROMPT RESOLUTION] Found ${promptReferences.length} prompt reference(s) in text`,
    );

    if (promptReferences.length === 0) {
      this.logger.debug(
        `🔍 [PROMPT RESOLUTION] No prompt references found. Returning original text.`,
      );
      return { processedText: text, resolvedPromptsMetadata };
    }

    let processedText = text;

    for (const match of promptReferences) {
      const fullMatch = match[0];
      const referenceContent = match[1].trim();
      const [promptName, versionTag, refLanguageCode] = referenceContent.split(':');

      this.logger.debug(
        `🔍 [PROMPT RESOLUTION] Processing reference: "${fullMatch}" -> promptName: "${promptName}", versionTag: "${versionTag || 'latest'}", refLanguageCode: "${refLanguageCode || 'none'}"`,
      );

      const promptNameSlug = slugify(promptName);
      
      // Check for circular references using slug for consistency
      if (processedPrompts.has(promptNameSlug)) {
        this.logger.warn(
          `⚠️ [PROMPT RESOLUTION] Circular reference detected for prompt "${promptName}" (slug: "${promptNameSlug}"). Skipping.`,
        );
        continue;
      }

      const targetLanguageCode = refLanguageCode || languageCode;

      this.logger.debug(
        `🔍 [PROMPT RESOLUTION] Searching for prompt with slug "${promptNameSlug}" (from name "${promptName}") in project "${projectId}"`,
      );

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
          this.logger.error(
            `❌ [PROMPT RESOLUTION] Referenced prompt "${promptName}" (slug: "${promptNameSlug}") not found in project "${projectId}".`,
          );
          throw new NotFoundException(
            `Referenced prompt "${promptName}" not found in project "${projectId}".`,
          );
        }

        this.logger.debug(
          `✅ [PROMPT RESOLUTION] Found referenced prompt: ID="${referencedPrompt.id}", name="${referencedPrompt.name}", type="${referencedPrompt.type}"`,
        );

        // Validaciones específicas por tipo de prompt
        if (currentPromptType === 'GUARD' && referencedPrompt.type !== 'GUARD') {
          this.logger.error(
            `❌ [PROMPT RESOLUTION] Guard prompt type validation failed: Guard prompts can only reference other guard prompts. Attempted to reference "${promptName}" of type ${referencedPrompt.type}.`,
          );
          throw new BadRequestException(
            `Guard prompts can only reference other guard prompts. Attempted to reference "${promptName}" of type ${referencedPrompt.type}.`,
          );
        }

        if (currentPromptType === 'SYSTEM' && referencedPrompt.type === 'USER') {
          this.logger.error(
            `❌ [PROMPT RESOLUTION] System prompt type validation failed: System prompts cannot reference user prompts. Attempted to reference "${promptName}".`,
          );
          throw new BadRequestException(
            `System prompts cannot reference user prompts. Attempted to reference "${promptName}".`,
          );
        }

        this.logger.debug(
          `🔄 [PROMPT RESOLUTION] Recursively executing prompt "${promptName}" (slug: "${promptNameSlug}") with version "${versionTag || 'latest'}" and language "${targetLanguageCode || 'none'}"`,
        );

        const { processedPrompt, metadata } = await this.executePromptVersion(
          {
            projectId,
            promptName: promptNameSlug,
            versionTag: versionTag || 'latest',
            languageCode: targetLanguageCode,
          },
          { variables: {} },
          processedPrompts,
          {
            currentDepth: currentDepth + 1,
            maxDepth,
          },
        );

        this.logger.debug(
          `✅ [PROMPT RESOLUTION] Successfully resolved prompt "${promptName}". Processed content: "${processedPrompt.substring(0, 100)}${processedPrompt.length > 100 ? '...' : ''}"`,
        );

        processedText = processedText.replace(fullMatch, processedPrompt);
        resolvedPromptsMetadata.push({
          promptName,
          versionTag: versionTag || 'latest',
          languageUsed: targetLanguageCode,
          promptType: referencedPrompt.type,
          metadata,
        });

        this.logger.debug(
          `🔄 [PROMPT RESOLUTION] Replaced "${fullMatch}" with resolved content. Text after replacement: "${processedText.substring(0, 200)}${processedText.length > 200 ? '...' : ''}"`,
        );
      } catch (error) {
        this.logger.error(
          `❌ [PROMPT RESOLUTION] Failed to resolve prompt reference "${fullMatch}": ${error.message}`,
          error.stack,
        );
        this.logger.warn(
          `⚠️ [PROMPT RESOLUTION] Leaving placeholder "${fullMatch}" unresolved due to error.`,
        );
      }
    }

    this.logger.debug(
      `🎯 [PROMPT RESOLUTION] Completed resolving ${promptReferences.length} prompt reference(s). Final processed text: "${processedText.substring(0, 200)}${processedText.length > 200 ? '...' : ''}"`,
    );

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
    processedPrompts: Set<string> = new Set(),
    context: {
      currentDepth?: number;
      maxDepth?: number;
    } = {},
  ): Promise<{ processedPrompt: string; metadata: any }> {
    const { projectId, promptName, versionTag, languageCode } = params;
    const { variables } = body;
    const { currentDepth = 0, maxDepth = 5 } = context;

    // 🚨🚨🚨 SUPER OBVIOUS LOG TO CONFIRM CODE IS UPDATED 🚨🚨🚨
    console.log(`🚨🚨🚨 [SUPER OBVIOUS] executePromptVersion called with promptName: "${promptName}", project: "${projectId}", depth: ${currentDepth} 🚨🚨🚨`);
    
    this.logger.debug(
      `🚀 [EXECUTE PROMPT] Starting execution of prompt "${promptName}" v${versionTag} in project "${projectId}"${languageCode ? ` with language "${languageCode}"` : ''} (depth: ${currentDepth})`,
    );
    this.logger.debug(
      `🚀 [EXECUTE PROMPT] Variables provided: ${JSON.stringify(variables || {})}`,
    );

    // Check for circular references and max depth
    if (currentDepth >= maxDepth) {
      this.logger.warn(
        `⚠️ [EXECUTE PROMPT] Maximum depth (${maxDepth}) reached for prompt "${promptName}". Stopping execution.`,
      );
      throw new BadRequestException(
        `Maximum prompt reference depth (${maxDepth}) reached. Possible circular reference involving "${promptName}".`,
      );
    }

    const promptNameSlug = slugify(promptName);
    const currentProjectId = projectId;

    this.logger.debug(
      `🚀 [EXECUTE PROMPT] Converted prompt name "${promptName}" to slug "${promptNameSlug}"`,
    );

    // Check for circular references using the slug for consistency
    if (processedPrompts.has(promptNameSlug)) {
      this.logger.warn(
        `⚠️ [EXECUTE PROMPT] Circular reference detected for prompt "${promptName}" (slug: "${promptNameSlug}"). Stopping execution.`,
      );
      throw new BadRequestException(
        `Circular reference detected for prompt "${promptName}".`,
      );
    }

    // Add current prompt to processed set using slug for consistency
    processedPrompts.add(promptNameSlug);

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
      this.logger.error(
        `❌ [EXECUTE PROMPT] Prompt "${promptName}" (slug: "${promptNameSlug}") not found in project "${currentProjectId}".`,
      );
      throw new NotFoundException(
        `Prompt "${promptName}" (slug: "${promptNameSlug}") not found in project "${currentProjectId}".`,
      );
    }

    this.logger.debug(
      `✅ [EXECUTE PROMPT] Found prompt: ID="${prompt.id}", name="${prompt.name}", type="${prompt.type}", projectId="${prompt.projectId}"`,
    );

    // Validaciones específicas por tipo de prompt
    if (prompt.type === 'GUARD' && Object.keys(variables || {}).length > 0) {
      this.logger.error(
        `❌ [EXECUTE PROMPT] Guard prompt validation failed: Guard prompts cannot accept variables for security reasons.`,
      );
      throw new BadRequestException(
        'Guard prompts cannot accept variables for security reasons.',
      );
    }

    let versionToUse;
    if (versionTag === 'latest') {
      this.logger.debug(
        `🔍 [EXECUTE PROMPT] Searching for latest version of prompt "${prompt.id}"`,
      );
      
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
        this.logger.error(
          `❌ [EXECUTE PROMPT] No versions found for prompt "${promptName}" (ID: ${prompt.id}) in project "${currentProjectId}".`,
        );
        throw new NotFoundException(
          `No versions found for prompt "${promptName}" (ID: ${prompt.id}) in project "${currentProjectId}".`,
        );
      }
    } else {
      this.logger.debug(
        `🔍 [EXECUTE PROMPT] Searching for specific version "${versionTag}" of prompt "${prompt.id}"`,
      );
      
      versionToUse = await this.prisma.promptVersion.findUnique({
        where: {
          promptId_versionTag: { promptId: prompt.id, versionTag },
        },
        include: { prompt: true, translations: true },
      });

      if (!versionToUse) {
        this.logger.error(
          `❌ [EXECUTE PROMPT] Version "${versionTag}" for prompt "${promptName}" (ID: ${prompt.id}) in project "${currentProjectId}" not found.`,
        );
        throw new NotFoundException(
          `Version "${versionTag}" for prompt "${promptName}" (ID: ${prompt.id}) in project "${currentProjectId}" not found.`,
        );
      }
    }

    this.logger.debug(
      `✅ [EXECUTE PROMPT] Found version: ID="${versionToUse.id}", tag="${versionToUse.versionTag}", translations=${versionToUse.translations.length}`,
    );

    const finalLanguageCode = languageCode;
    let basePromptText = versionToUse.promptText;

    this.logger.debug(
      `📝 [EXECUTE PROMPT] Base prompt text: "${basePromptText.substring(0, 200)}${basePromptText.length > 200 ? '...' : ''}"`,
    );

    if (finalLanguageCode) {
      this.logger.debug(
        `🌐 [EXECUTE PROMPT] Looking for translation for language "${finalLanguageCode}"`,
      );
      
      const promptTranslation = versionToUse.translations.find(
        (t) => t.languageCode === finalLanguageCode,
      );
      if (promptTranslation) {
        basePromptText = promptTranslation.promptText;
        this.logger.debug(
          `✅ [EXECUTE PROMPT] Found translation for "${finalLanguageCode}": "${basePromptText.substring(0, 200)}${basePromptText.length > 200 ? '...' : ''}"`,
        );
      } else {
        this.logger.warn(
          `⚠️ [EXECUTE PROMPT] Translation for languageCode "${finalLanguageCode}" not found for prompt "${promptName}" v${versionTag}. Falling back to base text.`,
        );
      }
    }

    this.logger.debug(
      `🔄 [EXECUTE PROMPT] Starting prompt reference resolution with text: "${basePromptText.substring(0, 200)}${basePromptText.length > 200 ? '...' : ''}"`,
    );

    // First resolve prompt references - pass the existing processedPrompts and incremented depth
    const { processedText: textWithResolvedPrompts, resolvedPromptsMetadata } =
      await this.resolvePromptReferences(
        basePromptText,
        prompt.projectId,
        finalLanguageCode,
        processedPrompts, // Use the existing set
        {
          currentPromptType: prompt.type,
          currentDepth: currentDepth + 1, // Increment depth
          maxDepth,
        },
      );

    this.logger.debug(
      `✅ [EXECUTE PROMPT] Prompt references resolved. Result: "${textWithResolvedPrompts.substring(0, 200)}${textWithResolvedPrompts.length > 200 ? '...' : ''}"`,
    );
    this.logger.debug(
      `📊 [EXECUTE PROMPT] Resolved ${resolvedPromptsMetadata.length} prompt reference(s): ${resolvedPromptsMetadata.map(p => p.promptName).join(', ')}`,
    );

    this.logger.debug(
      `🔄 [EXECUTE PROMPT] Starting asset and variable resolution`,
    );

    // Then resolve assets and variables
    const { processedText, resolvedAssetsMetadata } = await this.resolveAssets(
      textWithResolvedPrompts,
      prompt.id,
      prompt.projectId,
      finalLanguageCode,
      variables,
    );

    this.logger.debug(
      `✅ [EXECUTE PROMPT] Asset and variable resolution completed. Final result: "${processedText.substring(0, 200)}${processedText.length > 200 ? '...' : ''}"`,
    );
    this.logger.debug(
      `📊 [EXECUTE PROMPT] Resolved ${resolvedAssetsMetadata.length} asset(s): ${resolvedAssetsMetadata.map(a => a.key).join(', ')}`,
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

    this.logger.debug(
      `🎯 [EXECUTE PROMPT] Execution completed successfully. Metadata: ${JSON.stringify(metadata, null, 2)}`,
    );

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
