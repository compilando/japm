import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Prompt, PromptVersion, PromptAssetVersion, PromptTranslation, AssetTranslation, Environment } from '@prisma/client';
// import { TemplateService } from '../template/template.service'; // Comentado temporalmente
import { ExecutePromptParamsDto } from './dto/execute-prompt-params.dto';
import { ExecutePromptQueryDto } from './dto/execute-prompt-query.dto';
import { ExecutePromptBodyDto } from './dto/execute-prompt-body.dto';

@Injectable()
export class ServePromptService {
    constructor(
        private prisma: PrismaService,
        // private templateService: TemplateService // Comentado temporalmente
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
        const includeRelations = {
            prompt: true,
            translations: true,
            assets: {
                include: {
                    assetVersion: { include: { asset: true, translations: true } }
                }
            },
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
            const assetVersion = link.assetVersion;
            const assetKey = assetVersion.asset.key;
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
                 const assetTranslation = finalLanguageCode ? link.assetVersion.translations.find(t => t.languageCode === finalLanguageCode) : null;
                 return {
                     key: link.assetVersion.asset.key,
                     versionId: link.assetVersion.id,
                     versionTag: link.assetVersion.versionTag,
                     languageUsed: finalLanguageCode ? (assetTranslation ? finalLanguageCode : 'base_asset_fallback') : 'base_asset'
                 };
             }),
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
