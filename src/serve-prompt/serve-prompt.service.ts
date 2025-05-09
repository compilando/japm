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
     * Executes a specific prompt version with given variables.
     * Handles translation and basic asset substitution.
     * @returns The processed prompt text ready for execution.
     */
    async executePromptVersion(
        params: ExecutePromptParamsDto,
        body: ExecutePromptBodyDto
    ): Promise<{ processedPrompt: string; metadata: any }> {
        const { projectId, promptName, versionTag, languageCode } = params;
        const { variables } = body;

        // 1. Find the Prompt within the Project using the correct composite key
        const promptNameSlug = slugify(promptName); // Slug es el ID ahora
        const prompt = await this.prisma.prompt.findUnique({
            where: {
                prompt_id_project_unique: { // Usar la clave correcta definida en el schema
                    id: promptNameSlug,     // El slug es el ID
                    projectId: projectId
                }
            },
        });

        if (!prompt) {
            // Mantener el mensaje de error con slug es útil para debug
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
        const finalLanguageCode = languageCode;
        let basePromptText = versionToUse.promptText;

        if (finalLanguageCode) {
            const promptTranslation = versionToUse.translations.find(t => t.languageCode === finalLanguageCode);
            if (promptTranslation) {
                basePromptText = promptTranslation.promptText;
            } else {
                console.warn(`Translation for languageCode "${finalLanguageCode}" not found for prompt "${promptName}" v${versionTag}. Falling back to base text.`);
            }
        }

        // --- NUEVA LÓGICA DE ASSETS --- 
        const potentialPlaceholders = [...basePromptText.matchAll(/\{\{([^}]+)\}\}/g)];
        const assetSpecifications = potentialPlaceholders
            .map(match => {
                const placeholderContent = match[1].trim();
                const parts = placeholderContent.split(':');
                const key = parts[0];
                const versionTag = parts.length > 1 ? parts[1] : undefined;
                return { placeholderContent, key, versionTag };
            })
            .filter(spec => !variables.hasOwnProperty(spec.key)); // Filtrar claves que NO están en las variables de entrada

        const assetContext: Record<string, string> = {};
        const resolvedAssetsMetadata: any[] = [];

        if (assetSpecifications.length > 0) {
            const uniqueAssetKeys = [...new Set(assetSpecifications.map(spec => spec.key))];
            this.logger.debug(`Potential asset keys to resolve: ${uniqueAssetKeys.join(', ')}`);

            const foundAssets = await this.prisma.promptAsset.findMany({
                where: {
                    projectId: projectId,
                    key: { in: uniqueAssetKeys }
                },
                include: {
                    versions: { // Incluir todas las versiones para poder seleccionar la correcta
                        orderBy: { createdAt: 'desc' }, // Ordenar para que la [0] sea la más nueva (fallback)
                        include: { translations: true }
                    }
                }
            });

            for (const spec of assetSpecifications) {
                const asset = foundAssets.find(a => a.key === spec.key);
                if (!asset) {
                    this.logger.warn(`Asset with key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") not found in project.`);
                    continue;
                }

                // Explicitly type asset.versions to ensure compatibility
                const assetVersions = asset.versions as (Prisma.PromptAssetVersionGetPayload<{ include: { translations: true } }>)[];

                let targetVersion: Prisma.PromptAssetVersionGetPayload<{ include: { translations: true } }> | undefined = undefined;

                if (spec.versionTag) {
                    targetVersion = assetVersions.find(v => v.versionTag === spec.versionTag);
                    if (!targetVersion) {
                        this.logger.warn(`Asset key "${spec.key}", version "${spec.versionTag}" (referenced as "{{${spec.placeholderContent}}}") not found. Falling back to latest active version.`);
                    }
                }

                if (!targetVersion) { // Si no se especificó versión, o la especificada no se encontró
                    targetVersion = assetVersions.find(v => v.status === 'active');
                }
                

                if (targetVersion) {
                    let assetValue = targetVersion.value; // Correct property for PromptAssetVersion
                    let languageSource = 'base_asset'; // Default language source

                    if (finalLanguageCode) {
                        const translation = targetVersion.translations.find(t => t.languageCode === finalLanguageCode);
                        if (translation) {
                            assetValue = translation.value;
                            languageSource = finalLanguageCode;
                        } else {
                            this.logger.warn(`Asset key "${spec.key}" v${targetVersion.versionTag} (referenced as "{{${spec.placeholderContent}}}"): No translation found for "${finalLanguageCode}". Using base value.`);
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
                    this.logger.warn(`Asset key "${spec.key}" (referenced as "{{${spec.placeholderContent}}}") found, but no suitable version (specified: ${spec.versionTag || 'any active'}) could be resolved.`);
                }
            }
        }
        // --- FIN NUEVA LÓGICA DE ASSETS ---

        // 5. Combine contexts and render
        const finalContext = { ...assetContext, ...variables }; // Ahora assetContext puede tener valores
        let processedPrompt: string;
        try {
            processedPrompt = basePromptText.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim(); // trimmedKey es ahora el placeholderContent, ej: "assetKey" o "assetKey:versionTag"
                if (finalContext.hasOwnProperty(trimmedKey)) {
                    return String(finalContext[trimmedKey]); // Reemplaza con variable o asset
                }
                // Si no está ni en variables ni en assets resueltos, advertir y dejar placeholder
                this.logger.warn(`Placeholder {{${trimmedKey}}} not found in variables or resolved assets.`);
                return match;
            });
        } catch (error) {
            console.error("Error rendering prompt template:", error);
            throw new BadRequestException(`Failed to render prompt template: ${error.message}`);
        }

        // 6. Prepare metadata
        const metadata = {
            projectId: projectId,
            promptName: prompt.name,
            promptVersionId: versionToUse.id,
            promptVersionTag: versionToUse.versionTag,
            languageUsed: finalLanguageCode ? (versionToUse.translations.some(t => t.languageCode === finalLanguageCode) ? finalLanguageCode : 'base_language_fallback') : 'base_language',
            assetsUsed: resolvedAssetsMetadata,
            variablesProvided: Object.keys(variables),
        };

        return { processedPrompt, metadata };
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
