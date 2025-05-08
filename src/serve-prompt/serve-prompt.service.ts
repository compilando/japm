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
        query: ExecutePromptQueryDto,
        body: ExecutePromptBodyDto
    ): Promise<{ processedPrompt: string; metadata: any }> {
        const { projectId, promptName, versionTag } = params;
        const { languageCode, environmentName } = query;
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
        const potentialAssetKeys = potentialPlaceholders
            .map(match => match[1].trim()) // Obtener la clave dentro de {{}}
            .filter(key => !variables.hasOwnProperty(key)); // Filtrar claves que NO están en las variables de entrada

        const uniquePotentialAssetKeys = [...new Set(potentialAssetKeys)];
        const assetContext: Record<string, string> = {};
        const resolvedAssetsMetadata: any[] = []; // Para metadata

        if (uniquePotentialAssetKeys.length > 0) {
            this.logger.debug(`Potential asset keys found: ${uniquePotentialAssetKeys.join(', ')}`);
            // Buscar los assets por sus claves en este proyecto
            const foundAssets = await this.prisma.promptAsset.findMany({
                where: {
                    projectId: projectId,
                    key: { in: uniquePotentialAssetKeys }
                },
                // Incluir la versión activa más reciente
                include: {
                    versions: {
                        where: { status: 'active' },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: { translations: true } // Incluir traducciones de la versión
                    }
                }
            });

            // Construir el assetContext
            for (const asset of foundAssets) {
                if (asset.versions && asset.versions.length > 0) {
                    const activeVersion = asset.versions[0];
                    let assetValue = activeVersion.value;

                    // Aplicar traducción si es necesario
                    if (finalLanguageCode) {
                        const translation = activeVersion.translations.find(t => t.languageCode === finalLanguageCode);
                        if (translation) {
                            assetValue = translation.value;
                            resolvedAssetsMetadata.push({
                                key: asset.key,
                                versionId: activeVersion.id,
                                versionTag: activeVersion.versionTag,
                                languageUsed: finalLanguageCode
                            });
                        } else {
                            // Log fallback, pero usar valor base
                            this.logger.warn(`Asset key "${asset.key}" v${activeVersion.versionTag}: No translation found for "${finalLanguageCode}". Using base value.`);
                            resolvedAssetsMetadata.push({
                                key: asset.key,
                                versionId: activeVersion.id,
                                versionTag: activeVersion.versionTag,
                                languageUsed: 'base_asset_fallback'
                            });
                        }
                    } else {
                        // Usar valor base directamente
                        resolvedAssetsMetadata.push({
                            key: asset.key,
                            versionId: activeVersion.id,
                            versionTag: activeVersion.versionTag,
                            languageUsed: 'base_asset'
                        });
                    }
                    assetContext[asset.key] = assetValue;
                } else {
                    this.logger.warn(`Asset key "${asset.key}" found, but it has no active version.`);
                }
            }
        }
        // --- FIN NUEVA LÓGICA DE ASSETS ---

        // 5. Combine contexts and render
        const finalContext = { ...assetContext, ...variables }; // Ahora assetContext puede tener valores
        let processedPrompt: string;
        try {
            processedPrompt = basePromptText.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim();
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
            assetsUsed: resolvedAssetsMetadata, // Usar los metadatos de assets resueltos
            variablesProvided: Object.keys(variables),
            environmentName: environmentName
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
