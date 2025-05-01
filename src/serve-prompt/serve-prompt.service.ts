import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServePromptQueryDto } from './dto/serve-prompt-query.dto';
import { Prisma, ConversationPrompt, ConversationPromptVersion, ConversationPromptAssetVersion, PromptTranslation, AssetTranslation } from '@prisma/client';

// Tipo extendido para incluir datos de versión, traducción y assets
// Ya no es estrictamente necesario para el valor de retorno de serve(), pero se mantiene por si se usa internamente
type PromptVersionWithDetails = Prisma.ConversationPromptVersionGetPayload<{
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
    constructor(private prisma: PrismaService) { }

    // Modificar el tipo de retorno a Promise<string>
    async serve(query: ServePromptQueryDto): Promise<string> {
        let targetPrompt: ConversationPrompt | null = null;

        // 1. Encontrar el ConversationPrompt lógico
        if (query.promptId) {
            targetPrompt = await this.prisma.conversationPrompt.findUnique({
                where: { name: query.promptId },
            });
            if (!targetPrompt) {
                throw new NotFoundException(`Prompt with NAME ${query.promptId} not found.`);
            }
        } else if (query.tacticId) {
            // Buscar el primer prompt que use esta táctica (podría haber varios, ¿necesitamos más filtros?)
            // Podríamos añadir más lógica aquí si múltiples prompts pueden compartir táctica
            targetPrompt = await this.prisma.conversationPrompt.findFirst({
                where: { tacticId: query.tacticId },
                // Podríamos ordenar por nombre o fecha de creación si hay varios
            });
            if (!targetPrompt) {
                throw new NotFoundException(`No prompt found for tactic NAME ${query.tacticId}.`);
            }
        } else {
            throw new BadRequestException('Must provide either promptId or tacticId.');
        }

        // 2. Determinar la ConversationPromptVersion a usar
        let targetVersionId: string | undefined = undefined;

        if (query.useLatestActive !== false) {
            // Buscar la versión activa
            const promptWithActiveVersion = await this.prisma.conversationPrompt.findUnique({
                where: { name: targetPrompt.name },
                select: { activeVersionId: true }
            });
            if (!promptWithActiveVersion?.activeVersionId) {
                throw new NotFoundException(`Prompt ${targetPrompt.name} does not have an active version set.`);
            }
            targetVersionId = promptWithActiveVersion.activeVersionId;

            // Si se especificó un versionTag *y* useLatestActive es true (comportamiento por defecto),
            // podríamos considerar si lanzar un warning o priorizar la activa.
            // Por ahora, priorizamos la activa.
            if (query.versionTag) {
                console.warn(`(Serve) Ignoring versionTag '${query.versionTag}' because useLatestActive is true/default. Using active version.`);
            }

        } else {
            // useLatestActive es explícitamente false, buscar por versionTag
            if (!query.versionTag) {
                throw new BadRequestException('Must provide versionTag when useLatestActive is false.');
            }
            const specificVersion = await this.prisma.conversationPromptVersion.findUnique({
                where: {
                    promptId_versionTag: { // Usar índice único
                        promptId: targetPrompt.name,
                        versionTag: query.versionTag,
                    }
                },
                select: { id: true }
            });
            if (!specificVersion) {
                throw new NotFoundException(`Version with tag '${query.versionTag}' not found for prompt ${targetPrompt.name}.`);
            }
            targetVersionId = specificVersion.id;
        }

        // 3. Obtener los detalles completos de la versión seleccionada (incluyendo assets y traducciones)
        const promptVersionData = await this.prisma.conversationPromptVersion.findUnique({
            where: { id: targetVersionId },
            include: {
                prompt: true, // Incluir el prompt padre
                translations: true, // Incluir traducciones disponibles de esta versión
                assets: { // Incluir links ordenados por posición (si existe)
                    orderBy: { position: 'asc' },
                    include: {
                        assetVersion: { // Incluir la versión del asset
                            include: {
                                asset: true, // Incluir el asset padre (para la 'key')
                                translations: true, // Incluir traducciones disponibles de esta versión del asset
                            }
                        }
                    }
                }
            }
        });

        if (!promptVersionData) {
            // Esto no debería ocurrir si los pasos anteriores funcionaron, pero por seguridad:
            throw new NotFoundException(`Prompt version details could not be loaded for version ID ${targetVersionId}.`);
        }

        // 4. Determinar el texto base del prompt (traducido o por defecto)
        let promptTextToUse: string = promptVersionData.promptText; // Texto base por defecto
        if (query.languageCode) {
            const translation = promptVersionData.translations.find(t => t.languageCode === query.languageCode);
            if (translation) {
                promptTextToUse = translation.promptText;
            } else {
                // Opcional: podríamos buscar en una región "padre" o usar un idioma por defecto si la traducción exacta no existe.
                console.warn(`(Serve) Prompt translation for language '${query.languageCode}' not found for version ${promptVersionData.versionTag}. Falling back to base text.`);
                // Se usará promptVersionData.promptText
            }
        }

        // 5. Preparar mapa de assets (clave -> valor a usar)
        const assetsValueMap = new Map<string, string>();
        promptVersionData.assets.forEach(link => {
            const assetVersion = link.assetVersion;
            if (assetVersion?.asset?.key) { // Verificar que tenemos la versión del asset y su clave
                let assetValueToUse = assetVersion.value; // Valor base por defecto
                if (query.languageCode) {
                    const assetTranslation = assetVersion.translations.find(t => t.languageCode === query.languageCode);
                    if (assetTranslation) {
                        assetValueToUse = assetTranslation.value;
                    } else {
                        console.warn(`(Serve) Asset '${assetVersion.asset.key}' translation for language '${query.languageCode}' not found for version ${assetVersion.versionTag}. Falling back to base value.`);
                        // Se usará assetVersion.value
                    }
                }
                assetsValueMap.set(assetVersion.asset.key, assetValueToUse);
            } else {
                console.warn(`(Serve) Asset link for prompt version ${promptVersionData.id} links to an incomplete asset version or asset.`);
            }
        });

        // 6. Ensamblar el prompt final reemplazando placeholders {{key}}
        let assembledText = promptTextToUse.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();
            const assetValue = assetsValueMap.get(trimmedKey);
            if (assetValue !== undefined) { // Usar !== undefined por si el valor es una cadena vacía
                return assetValue;
            }
            console.warn(`(Serve) Placeholder {{${trimmedKey}}} not found in linked assets for prompt version ${promptVersionData.versionTag}. Leaving placeholder.`);
            return match; // Dejar placeholder si no se encuentra el asset
        });

        // 7. Devolver resultado: solo la cadena ensamblada
        return assembledText;
    }
}

// Nota: Faltaría implementar la lógica para crear/actualizar prompts, versiones y traducciones.
// Esta función solo se encarga de servir el prompt ensamblado.
