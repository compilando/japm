import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptAssetVersion, PromptTranslation, AssetTranslation, Environment, CulturalData } from '@prisma/client';
// import { TemplateService } from '../template/template.service'; // Temporarily commented out
import { ExecutePromptParamsDto } from './dto/execute-prompt-params.dto';
import { ExecutePromptQueryDto } from './dto/execute-prompt-query.dto';
import { ExecutePromptBodyDto } from './dto/execute-prompt-body.dto';

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

        // 1. Find the Prompt within the Project
        const prompt = await this.prisma.prompt.findUnique({
            where: { projectId_name: { projectId, name: promptName } },
        });

        if (!prompt) {
            throw new NotFoundException(`Prompt "${promptName}" not found in project "${projectId}".`);
        }

        // 2. Find the specific PromptVersion
        const includeRelations: Prisma.PromptVersionInclude = {
            prompt: true,
            translations: true,
            assets: true,
        };

        const versionToUse = await this.prisma.promptVersion.findUnique({
            where: {
                promptId_versionTag: { promptId: prompt.id, versionTag },
            },
            include: includeRelations,
        });

        if (!versionToUse) {
            throw new NotFoundException(`Version "${versionTag}" for prompt "${promptName}" (ID: ${prompt.id}) in project "${projectId}" not found.`);
        }

        // --- NUEVO: Cargar detalles de AssetVersion por separado ---
        let assetVersionsMap: Map<string, Prisma.PromptAssetVersionGetPayload<{ include: { asset: true, translations: true } }>> = new Map();
        if (versionToUse.assets && versionToUse.assets.length > 0) {
            // 1. Extraer IDs únicos de assetVersion
            const assetVersionIds = [...new Set(versionToUse.assets.map(link => link.assetVersionId))];

            // 2. Consultar los detalles de PromptAssetVersion
            const assetVersionsDetails = await this.prisma.promptAssetVersion.findMany({
                where: { id: { in: assetVersionIds } },
                include: {
                    asset: true, // Incluir el PromptAsset base
                    translations: true // Incluir las AssetTranslations
                }
            });

            // 3. Crear un mapa para búsqueda rápida por ID
            for (const av of assetVersionsDetails) {
                assetVersionsMap.set(av.id, av);
            }
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

        // 4. Prepare asset context (basic substitution)
        const assetContext: Record<string, string> = {};
        for (const link of versionToUse.assets) {
            // --- USAR MAPA ---
            const assetVersion = assetVersionsMap.get(link.assetVersionId);
            if (!assetVersion) {
                console.warn(`AssetVersion details not found for ID: ${link.assetVersionId}. Skipping asset.`);
                continue; // Saltar este asset si no se encontraron sus detalles
            }
            // --- FIN USAR MAPA ---

            // Ahora assetVersion tiene la estructura { id, asset, translations, value, ... }
            const assetKey = assetVersion.asset.key; // Acceder a asset anidado
            let assetValue = assetVersion.value;

            if (finalLanguageCode) {
                const assetTranslation = assetVersion.translations.find(t => t.languageCode === finalLanguageCode);
                if (assetTranslation) {
                    assetValue = assetTranslation.value;
                }
            }
            assetContext[assetKey] = assetValue;
        }

        // 5. Combine contexts and render
        const finalContext = { ...assetContext, ...variables };
        let processedPrompt: string;
        try {
            processedPrompt = basePromptText.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim();
                if (finalContext.hasOwnProperty(trimmedKey)) {
                    return String(finalContext[trimmedKey]);
                }
                console.warn(`Placeholder {{${trimmedKey}}} not found in provided variables or assets.`);
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
            assetsUsed: versionToUse.assets.map(link => {
                // --- USAR MAPA ---
                const assetVersion = assetVersionsMap.get(link.assetVersionId);
                if (!assetVersion) {
                    // Retornar un objeto indicando el problema o filtrar este resultado
                    return { key: `MISSING_ASSET_VERSION_${link.assetVersionId}`, error: true };
                }
                const assetTranslation = finalLanguageCode ? assetVersion.translations.find(t => t.languageCode === finalLanguageCode) : null;
                // --- FIN USAR MAPA ---
                return {
                    key: assetVersion.asset.key, // Acceder a asset anidado
                    versionId: assetVersion.id,
                    versionTag: assetVersion.versionTag,
                    languageUsed: finalLanguageCode ? (assetTranslation ? finalLanguageCode : 'base_asset_fallback') : 'base_asset'
                };
            }).filter(asset => !asset.error), // Filtrar los que tuvieron error (opcional)
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
