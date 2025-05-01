import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServePromptQueryDto } from './dto/serve-prompt-query.dto';
import { Prisma, Prompt, PromptVersion, PromptAssetVersion, PromptTranslation, AssetTranslation } from '@prisma/client';
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
    }
}>;

@Injectable()
export class ServePromptService {
    constructor(
        private prisma: PrismaService,
        // private templateService: TemplateService // Comentado temporalmente
    ) { }

    async servePrompt(
        promptName: string,
        languageCode: string,
        versionTag?: string,
        context?: Record<string, any>
    ): Promise<{ processedPrompt: string; metadata: any }> {
        let targetPrompt: Prompt | null = null;

        // 1. Encontrar el Prompt lógico
        targetPrompt = await this.prisma.prompt.findUnique({
            where: { name: promptName },
        });

        if (!targetPrompt) {
            throw new NotFoundException(`Prompt with name "${promptName}" not found.`);
        }

        // 2. Determinar la PromptVersion a usar
        let versionToUse: PromptVersionWithDetails | null = null;

        if (versionTag) {
            // Si se especifica una versión, buscarla directamente
            versionToUse = await this.prisma.promptVersion.findUnique({
                where: { promptId_versionTag: { promptId: promptName, versionTag } },
                include: {
                    prompt: true,
                    translations: true,
                    assets: {
                        include: {
                            assetVersion: { include: { asset: true, translations: true } }
                        }
                    }
                }
            });
            if (!versionToUse) {
                throw new NotFoundException(`Version "${versionTag}" for prompt "${promptName}" not found.`);
            }
        } else if (targetPrompt.activeVersionId) {
            // Si no se especifica versión, usar la activa
            versionToUse = await this.prisma.promptVersion.findUnique({
                where: { id: targetPrompt.activeVersionId },
                include: {
                    prompt: true,
                    translations: true,
                    assets: {
                        include: {
                            assetVersion: { include: { asset: true, translations: true } }
                        }
                    }
                }
            });
            if (!versionToUse) {
                // Esto sería un estado inconsistente (activeVersionId apunta a algo inexistente)
                throw new Error(`Active version ID "${targetPrompt.activeVersionId}" for prompt "${promptName}" is invalid.`);
            }
        } else {
            // Si no hay versión activa, no podemos servir el prompt
            throw new NotFoundException(`Prompt "${promptName}" does not have an active version and no specific version was requested.`);
        }

        // 3. Obtener el texto base del prompt (traducido si es posible)
        let basePromptText = versionToUse.promptText;

        const promptTranslation = versionToUse.translations.find(t => t.languageCode === languageCode);
        if (promptTranslation) {
            basePromptText = promptTranslation.promptText;
        }
        // TODO: Añadir lógica de fallback de idioma si no se encuentra el específico?

        // 4. Preparar el contexto de los assets para el motor de plantillas
        const assetContext: Record<string, string> = {};
        for (const link of versionToUse.assets) {
            const assetVersion = link.assetVersion;
            const assetKey = assetVersion.asset.key;

            let assetValue = assetVersion.value;
            const assetTranslation = assetVersion.translations.find(t => t.languageCode === languageCode);
            if (assetTranslation) {
                assetValue = assetTranslation.value;
            }
            // TODO: Añadir lógica de fallback de idioma para assets?

            assetContext[assetKey] = assetValue;
        }

        // 5. Combinar contexto de assets y contexto de usuario
        const finalContext = { ...assetContext, ...context };

        // 6. Procesar el texto del prompt con el contexto
        let processedPrompt: string;
        try {
            // Reemplazo simple por ahora, hasta confirmar TemplateService
            processedPrompt = basePromptText.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim();
                // Usar finalContext en lugar de llamar a templateService.render
                return finalContext.hasOwnProperty(trimmedKey) ? finalContext[trimmedKey] : match;
            });
            // processedPrompt = this.templateService.render(basePromptText, finalContext); // Comentado temporalmente
        } catch (error) {
            console.error("Error rendering prompt template:", error);
            throw new BadRequestException(`Failed to render prompt template: ${error.message}`);
        }

        // 7. Preparar metadatos para la respuesta (opcional)
        const metadata = {
            promptName: targetPrompt.name,
            promptVersionId: versionToUse.id,
            promptVersionTag: versionToUse.versionTag,
            languageUsed: promptTranslation ? languageCode : 'default', // Indicar si se usó traducción
            assetsUsed: versionToUse.assets.map(link => {
                // Definir assetTranslation aquí para que esté en el scope correcto
                const assetTranslation = link.assetVersion.translations.find(t => t.languageCode === languageCode);
                return {
                    key: link.assetVersion.asset.key,
                    versionId: link.assetVersion.id,
                    versionTag: link.assetVersion.versionTag,
                    languageUsed: assetTranslation ? languageCode : 'default' // Indicar si se usó traducción del asset
                };
            })
        };

        return { processedPrompt, metadata };
    }
}

// Nota: Faltaría implementar la lógica para crear/actualizar prompts, versiones y traducciones.
// Esta función solo se encarga de servir el prompt ensamblado.
