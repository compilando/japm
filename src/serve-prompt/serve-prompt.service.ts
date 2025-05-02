import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServePromptQueryDto } from './dto/serve-prompt-query.dto';
import { Prisma, Prompt, PromptVersion, PromptAssetVersion, PromptTranslation, AssetTranslation, Environment } from '@prisma/client';
// import { TemplateService } from '../template/template.service'; // Comentado temporalmente

// Tipo helper para obtener el payload con relaciones profundas
type PromptVersionWithDetails = Prisma.PromptVersionGetPayload<{
    include: {
        prompt: true;
        translations: true;
        assets: {
            include: {
                assetVersion: {
                    include: {
                        asset: true;
                        translations: true;
                    }
                }
            }
        }
        activeInEnvironments: true;
    }
}>;

@Injectable()
export class ServePromptService {
    constructor(
        private prisma: PrismaService,
        // private templateService: TemplateService // Comentado temporalmente
    ) { }

    async serveProjectPrompt(
        projectId: string,
        environmentName: string,
        promptName: string,
        languageCode?: string,
        versionTag?: string,
        context?: Record<string, any>
    ): Promise<{ processedPrompt: string; metadata: any }> {
        let targetPrompt: Prompt | null = null;

        // 1. Find the target Environment within the Project
        const environment = await this.prisma.environment.findUnique({
            where: { projectId_name: { projectId, name: environmentName } },
            include: { activePromptVersions: { select: { id: true } } }
        });

        if (!environment) {
            throw new NotFoundException(`Environment "${environmentName}" not found in project "${projectId}".`);
        }

        // Determine default language if not provided
        const finalLanguageCode = languageCode || 'en';

        // 2. Find the Prompt within the Project using findFirst as workaround
        targetPrompt = await this.prisma.prompt.findFirst({
            where: {
                projectId: projectId,
                name: promptName
            },
        });

        if (!targetPrompt) {
            throw new NotFoundException(`Prompt "${promptName}" not found in project "${projectId}".`);
        }

        // 3. Determine the PromptVersion to use
        let versionToUse: PromptVersionWithDetails | null = null;

        const includeRelations = {
            prompt: true,
            translations: true,
            assets: {
                include: {
                    assetVersion: { include: { asset: true, translations: true } }
                }
            },
            activeInEnvironments: true,
        };

        if (versionTag) {
            versionToUse = await this.prisma.promptVersion.findUnique({
                where: {
                    promptId_versionTag: { promptId: promptName, versionTag },
                    prompt: { projectId: projectId }
                },
                include: includeRelations,
            });
            if (!versionToUse) {
                throw new NotFoundException(`Version "${versionTag}" for prompt "${promptName}" in project "${projectId}" not found.`);
            }
            const isActive = versionToUse.activeInEnvironments.some(env => env.id === environment.id);
            if (!isActive) {
                console.warn(`Requested version ${versionTag} is not explicitly active in environment ${environmentName}. Serving anyway.`);
            }
        } else {
            const activeVersion = await this.prisma.promptVersion.findFirst({
                where: {
                    promptId: promptName,
                    prompt: { projectId: projectId },
                    activeInEnvironments: { some: { id: environment.id } }
                },
                include: includeRelations,
                orderBy: { createdAt: 'desc' }
            });

            if (!activeVersion) {
                throw new NotFoundException(`No active version found for prompt "${promptName}" in environment "${environmentName}" for project "${projectId}".`);
            }
            versionToUse = activeVersion;
        }

        // 4. Get base prompt text (translated if possible)
        let basePromptText = versionToUse.promptText;
        const promptTranslation = versionToUse.translations.find(t => t.languageCode === finalLanguageCode);
        if (promptTranslation) {
            basePromptText = promptTranslation.promptText;
        }

        // 5. Prepare asset context
        const assetContext: Record<string, string> = {};
        for (const link of versionToUse.assets) {
            const assetVersion = link.assetVersion;
            const assetKey = assetVersion.asset.key;
            let assetValue = assetVersion.value;
            const assetTranslation = assetVersion.translations.find(t => t.languageCode === finalLanguageCode);
            if (assetTranslation) {
                assetValue = assetTranslation.value;
            }
            assetContext[assetKey] = assetValue;
        }

        // 6. Combine contexts and render
        const finalContext = { ...assetContext, ...context };
        let processedPrompt: string;
        try {
            processedPrompt = basePromptText.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim();
                return finalContext.hasOwnProperty(trimmedKey) ? finalContext[trimmedKey] : match;
            });
        } catch (error) {
            console.error("Error rendering prompt template:", error);
            throw new BadRequestException(`Failed to render prompt template: ${error.message}`);
        }

        // 7. Prepare metadata
        const metadata = {
            projectId: projectId,
            environmentName: environmentName,
            promptName: targetPrompt.name,
            promptVersionId: versionToUse.id,
            promptVersionTag: versionToUse.versionTag,
            languageUsed: promptTranslation ? finalLanguageCode : 'default',
            assetsUsed: versionToUse.assets.map(link => {
                const assetTranslation = link.assetVersion.translations.find(t => t.languageCode === finalLanguageCode);
                return {
                    key: link.assetVersion.asset.key,
                    versionId: link.assetVersion.id,
                    versionTag: link.assetVersion.versionTag,
                    languageUsed: assetTranslation ? finalLanguageCode : 'default'
                };
            })
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
