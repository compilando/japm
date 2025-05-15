import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptAssetVersion, PromptTranslation, AssetTranslation, Environment, CulturalData } from '@prisma/client';
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
     * @param projectId The ID of the project to scope asset search.
     * @param languageCode Optional language code for asset translation.
     * @param inputVariables Optional map of variables to distinguish from assets.
     * @param promptContext Optional prompt context for better logging
     * @returns An object containing the processed text and metadata about resolved assets.
     */
    async resolveAssets(
        text: string,
        projectId: string,
        languageCode?: string,
        inputVariables: Record<string, any> = {}, // Default to empty object
        promptContext?: { id?: string; name?: string } // Added optional promptContext
    ): Promise<{ processedText: string; resolvedAssetsMetadata: any[] }> {
        let contextLog = `project "${projectId}"`;
        if (promptContext?.id || promptContext?.name) {
            const promptIdentifier = promptContext.name ? `prompt "${promptContext.name}"` : `prompt ID "${promptContext.id}"`;
            contextLog = `${promptIdentifier} (project: "${projectId}")`;
        }
        this.logger.debug(`Resolving assets for ${contextLog}${languageCode ? ` with language "${languageCode}"` : ''}`);
        const potentialPlaceholders = [...text.matchAll(/\{\{([^}]+)\}\}/g)];

        const assetSpecifications = potentialPlaceholders
            .map(match => {
                const placeholderContent = match[1].trim();
                const parts = placeholderContent.split(':');
                const key = parts[0];
                const versionTag = parts.length > 1 ? parts[1] : undefined;
                return { placeholderContent, key, versionTag };
            })
            // Filter out placeholders that are actually keys in the inputVariables
            .filter(spec => !inputVariables.hasOwnProperty(spec.key) && !inputVariables.hasOwnProperty(spec.placeholderContent));


        const assetContext: Record<string, string> = {};
        const resolvedAssetsMetadata: any[] = [];

        if (assetSpecifications.length > 0) {
            const uniqueAssetKeys = [...new Set(assetSpecifications.map(spec => spec.key))];
            this.logger.debug(`Potential asset keys to resolve from text: ${uniqueAssetKeys.join(', ')} after filtering against input variables.`);

            const foundAssets = await this.prisma.promptAsset.findMany({
                where: {
                    projectId: projectId,
                    key: { in: uniqueAssetKeys }
                },
                include: {
                    versions: {
                        orderBy: { createdAt: 'desc' },
                        include: { translations: true }
                    }
                }
            });

            // Updated log message here
            const foundAssetsLogMessage = promptContext?.id || promptContext?.name ?
                `Found ${foundAssets.length} asset(s) in DB (project "${projectId}") for keys from prompt "${promptContext.name || promptContext.id}":` :
                `Found ${foundAssets.length} asset(s) in DB for project "${projectId}" matching keys from text:`;
            this.logger.debug(foundAssetsLogMessage);

            for (const asset of foundAssets) {
                if (asset.versions.length > 0) {
                    const latestVersion = asset.versions[0]; // Due to orderBy, this is the latest by createdAt
                    this.logger.debug(
                        `  - Asset Key: "${asset.key}", ` +
                        `Latest Version ID: "${latestVersion.id}", ` +
                        `Tag: "${latestVersion.versionTag}", ` +
                        `Status: "${latestVersion.status}", ` +
                        `Value: "${latestVersion.value.substring(0, 50)}${latestVersion.value.length > 50 ? '...' : ''}", ` +
                        `Translations: ${latestVersion.translations.length > 0 ? latestVersion.translations.map(t => t.languageCode).join(', ') : 'none'}`
                    );
                } else {
                    this.logger.debug(`  - Asset Key: "${asset.key}" (No versions found)`);
                }
            }

            for (const spec of assetSpecifications) {
                const asset = foundAssets.find(a => a.key === spec.key);
                if (!asset) {
                    this.logger.warn(`Asset with key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") not found in project "${projectId}".`);
                    continue;
                }

                const assetVersions = asset.versions as (Prisma.PromptAssetVersionGetPayload<{ include: { translations: true } }>)[];
                let targetVersion: Prisma.PromptAssetVersionGetPayload<{ include: { translations: true } }> | undefined = undefined;

                if (spec.versionTag) {
                    targetVersion = assetVersions.find(v => v.versionTag === spec.versionTag);
                    if (!targetVersion) {
                        this.logger.warn(`Asset key "${spec.key}", version "${spec.versionTag}" (referenced as "{{${spec.placeholderContent}}}") not found. Falling back to latest active version.`);
                    }
                }

                if (!targetVersion) {
                    targetVersion = assetVersions.find(v => v.status === 'active');
                }


                if (targetVersion) {
                    let assetValue = targetVersion.value;
                    let languageSource = 'base_asset';

                    if (languageCode) {
                        const translation = targetVersion.translations.find(t => t.languageCode === languageCode);
                        if (translation) {
                            assetValue = translation.value;
                            languageSource = languageCode;
                        } else {
                            this.logger.warn(`Asset key "${spec.key}" v${targetVersion.versionTag} (referenced as "{{${spec.placeholderContent}}}"): No translation found for "${languageCode}". Using base value.`);
                            languageSource = 'base_asset_fallback';
                        }
                    }

                    assetContext[spec.placeholderContent] = assetValue;
                    resolvedAssetsMetadata.push({
                        key: asset.key,
                        placeholderUsed: spec.placeholderContent,
                        versionId: targetVersion.id,
                        versionTag: targetVersion.versionTag,
                        languageUsed: languageSource
                    });
                } else {
                    this.logger.warn(`Asset key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") found, but no suitable version (specified: ${spec.versionTag || 'any active'}) could be resolved for project "${projectId}".`);
                }
            }
        }

        // Combine asset context with input variables for final substitution
        // Input variables should take precedence if there's an overlap in keys (though asset filtering should prevent this for asset placeholders)
        const finalContext = { ...assetContext, ...inputVariables };
        let processedText: string;
        try {
            processedText = text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim(); // This is the placeholderContent
                if (finalContext.hasOwnProperty(trimmedKey)) {
                    return String(finalContext[trimmedKey]);
                }
                this.logger.warn(`Placeholder {{${trimmedKey}}} not found in provided variables or resolved assets.`);
                return match; // Keep placeholder if not found
            });
        } catch (error) {
            this.logger.error("Error during placeholder substitution:", error);
            // Decide how to handle: throw, or return text unmodified, or with partial substitution
            // For now, let's throw, consistent with original executePromptVersion
            throw new BadRequestException(`Failed to substitute placeholders: ${error.message}`);
        }

        return { processedText, resolvedAssetsMetadata };
    }

    /**
     * Executes a specific prompt version with given variables.
     * Handles translation and asset substitution.
     * @returns The processed prompt text ready for execution.
     */
    async executePromptVersion(
        params: ExecutePromptParamsDto,
        body: ExecutePromptBodyDto
    ): Promise<{ processedPrompt: string; metadata: any }> {
        const { projectId, promptName, versionTag, languageCode } = params;
        const { variables } = body; // variables from the body are the inputVariables

        // 1. Find the Prompt within the Project using the correct composite key
        const promptNameSlug = slugify(promptName);
        const prompt = await this.prisma.prompt.findUnique({
            where: {
                prompt_id_project_unique: {
                    id: promptNameSlug,
                    projectId: projectId
                }
            },
        });

        if (!prompt) {
            throw new NotFoundException(`Prompt "${promptName}" (ID/slug: "${promptNameSlug}") not found in project "${projectId}".`);
        }

        // 2. Find the specific PromptVersion
        const versionToUse = await this.prisma.promptVersion.findUnique({
            where: {
                promptId_versionTag: { promptId: prompt.id, versionTag },
            },
            include: { prompt: true, translations: true },
        });

        if (!versionToUse) {
            throw new NotFoundException(`Version "${versionTag}" for prompt "${promptName}" (ID: ${prompt.id}) in project "${projectId}" not found.`);
        }

        // 3. Determine language and get base prompt text
        const finalLanguageCode = languageCode; // Use languageCode from params
        let basePromptText = versionToUse.promptText;

        if (finalLanguageCode) {
            const promptTranslation = versionToUse.translations.find(t => t.languageCode === finalLanguageCode);
            if (promptTranslation) {
                basePromptText = promptTranslation.promptText;
            } else {
                this.logger.warn(`Translation for languageCode "${finalLanguageCode}" not found for prompt "${promptName}" v${versionTag}. Falling back to base text.`);
            }
        }

        // 4. Resolve assets and substitute placeholders (including variables)
        // variables from body are passed as inputVariables
        const { processedText, resolvedAssetsMetadata } = await this.resolveAssets(
            basePromptText,
            projectId,
            finalLanguageCode, // Pass language code for asset translation consistency
            variables,
            { id: prompt.id, name: prompt.name } // Pass prompt context
        );

        // 5. Prepare metadata
        const metadata = {
            projectId: projectId,
            promptName: prompt.name, // Use original name for metadata
            promptId: prompt.id,
            promptVersionId: versionToUse.id,
            promptVersionTag: versionToUse.versionTag,
            languageUsed: finalLanguageCode ? (versionToUse.translations.some(t => t.languageCode === finalLanguageCode) ? finalLanguageCode : 'base_language_fallback') : 'base_language',
            assetsUsed: resolvedAssetsMetadata,
            variablesProvided: Object.keys(variables || {}), // Ensure variables is not null
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
