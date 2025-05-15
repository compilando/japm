import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Traducciones específicas para el proyecto creativo
const creativeTranslations = {
    assets: {
        'main-char-profile-jax': `Jax: Ex-military cyborg, cynical but skilled pilot. Haunted by a past mission. Distrusts authority. Has a cybernetic arm with hidden tools. Motivation: Finding his missing sister.`,
        'setting-neo-kyoto': `Neo-Kyoto, 2242: A sprawling, slick metropolis dominated by mega-corporations. Holographic ads flicker on imposing skyscrapers. Lower levels are dangerous, full of black markets and cyber gangs. Upper levels are pristine but sterile.`,
        'narrative-tone-noir': `Maintain a raw, noir tone. Focus on atmosphere, shadows, rain, moral ambiguity. Use descriptive language that emphasizes the contrast between high technology and social decay.`
    },
    prompts: {
        'generate-scene': `Generate a scene for the science fiction novel with the following characteristics:\n\nScene: {scene type}\nCharacters: {characters}\nSetting: {setting}\n\nThe scene should include:\n- Natural dialogue\n- Atmospheric description\n- Character development\n- Plot advancement\n\nMaintain the established cyberpunk noir tone.`,
        'develop-character': `Develop a character for the novel with the following characteristics:\n\nName: {name}\nRole: {role}\nBackground: {background}\n\nThe development should include:\n- Backstory\n- Motivations\n- Internal conflicts\n- Relationships with other characters\n- Character arc\n\nCreate a complex and memorable character.`,
        'world-building': `Develop an aspect of the novel's world:\n\nAspect: {aspect}\nLocation: {location}\n\nThe development should include:\n- Physical description\n- Social system\n- Technology\n- History\n- Impact on the plot\n\nCreate a rich and coherent world.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);

    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        include: {
            prompt: { select: { id: true } } // Solo necesitamos el id (slug) del prompt padre
        }
    });

    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: {
            asset: { // Filtro a través de PromptAsset
                prompt: { // PromptAsset está vinculado a un Prompt
                    projectId: projectId // Y el Prompt tiene el projectId
                }
            }
        },
        include: {
            asset: { select: { key: true } } // Incluir el PromptAsset y seleccionar su 'key'
        }
    });

    for (const version of promptVersions) {
        const translationKey = version.prompt.id; // Este es el slug del prompt, ej: 'generate-scene'
        const translationText = creativeTranslations.prompts[translationKey] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
            update: { promptText: translationText },
            create: { versionId: version.id, languageCode: 'es-ES', promptText: translationText }
        });
        console.log(`Created Spanish translation for prompt version ${version.id} (prompt slug: ${translationKey})`);
    }

    for (const version of promptAssetVersions) {
        if (version.asset && version.asset.key) { // Asegurar que asset y asset.key existen
            const translationText = creativeTranslations.assets[version.asset.key] || version.value;
            await prisma.assetTranslation.upsert({
                where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
                update: { value: translationText },
                create: { versionId: version.id, languageCode: 'es-ES', value: translationText }
            });
            console.log(`Created Spanish translation for prompt asset version ${version.id} (asset key: ${version.asset.key})`);
        } else {
            console.warn(`Skipping translation for asset version ${version.id} due to missing asset key.`);
        }
    }
    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

// Definición de la función slugify (copiada de seed.codegen.ts)
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Creative Writing & Adaptation...`);
    console.log('Assuming prior cleanup...');

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });

    const defaultProjectId = 'default-project';
    const devEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'development', projectId: defaultProjectId } },
        select: { id: true }
    });

    const creativeProject = await prisma.project.upsert({
        where: { id: 'creative-content-project' },
        update: { name: 'Creative Content Generation', description: 'AI-powered creative content generation and ideation.', ownerUserId: testUser.id },
        create: {
            id: 'creative-content-project',
            name: 'Creative Content Generation',
            description: 'AI-powered creative content generation and ideation.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
        },
    });
    console.log(`Upserted Project: ${creativeProject.name}`);
    const crProjectId = creativeProject.id;

    await createSpanishRegionAndCulturalData(crProjectId);
    await createUSRegionAndCulturalData(crProjectId);

    const crGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: crProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: crProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const crGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: crProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: crProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${crProjectId}`);

    const crPrefix = 'cr_';
    const crBaseTags = ['creative-writing', 'sci-fi', 'character-dev', 'world-building', 'dialogue', 'plot-outline', 'adaptation'];
    const crTagMap: Map<string, string> = new Map();

    for (const baseTagName of crBaseTags) {
        const tagName = `${crPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: crProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: crProjectId },
            select: { id: true }
        });
        crTagMap.set(tagName, tag.id);
        console.log(`Upserted Tag: ${tagName} for project ${crProjectId}`);
    }

    const getCrTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => crTagMap.get(`${crPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // Definición de los Prompts Temáticos con sus assets locales
    const creativeProjectPrompts: {
        id: string;
        name: string;
        description: string;
        promptText: string;
        tags: string[];
        assets?: { key: string; name: string; initialValue: string; initialChangeMessage?: string }[];
        aiModelId?: string; // ID del AIModel a usar (opcional, usará el del proyecto si no)
        activeInEnvironments?: { id: string }[];
    }[] = [
            {
                id: slugify('generate-scene-dialogue'),
                name: 'Generate Scene with Dialogue',
                description: 'Generate a scene with dialogue between characters.',
                promptText: `Write a short scene (approx. 300 words) set in {{setting-neo-kyoto}}.\nCharacters involved: {{main-char-profile-jax}} and {{Secondary Character Description}}.\nScene Goal: {{Scene Goal / Conflict}}.\nDialogue should reflect the characters\' personalities and the {{narrative-tone-noir}}.\nFocus on showing, not telling. Include brief descriptions of actions and environment.`,
                tags: ['creative-writing', 'sci-fi', 'dialogue'],
                assets: [
                    {
                        key: 'setting-neo-kyoto',
                        name: 'Setting: Neo-Kyoto',
                        initialValue: creativeTranslations.assets['setting-neo-kyoto'] || 'Default setting description'
                    },
                    {
                        key: 'main-char-profile-jax',
                        name: 'Main Character: Jax',
                        initialValue: creativeTranslations.assets['main-char-profile-jax'] || 'Default character profile for Jax'
                    },
                    {
                        key: 'narrative-tone-noir',
                        name: 'Narrative Tone: Noir',
                        initialValue: creativeTranslations.assets['narrative-tone-noir'] || 'Default noir narrative tone'
                    }
                ],
                aiModelId: crGpt4o.id,
                activeInEnvironments: [{ id: devEnvironment.id }]
            },
            {
                id: slugify('develop-character-story'),
                name: 'Develop Character for Story',
                description: 'Develop a complex character for a story.',
                promptText: creativeTranslations.prompts['develop-character'] || 'Develop character: {{name}}',
                tags: ['creative-writing', 'character-dev'],
                aiModelId: crGpt4o.id,
                activeInEnvironments: [{ id: devEnvironment.id }]
            },
            {
                id: slugify('world-building-detail'),
                name: 'World Building Detail',
                description: 'Develop a specific aspect of the novel\'s world.',
                promptText: creativeTranslations.prompts['world-building'] || 'Develop world aspect: {{aspect}} in {{location}}',
                tags: ['creative-writing', 'world-building', 'sci-fi'],
                assets: [
                    {
                        key: 'setting-neo-kyoto',
                        name: 'Setting: Neo-Kyoto (for world-building context)',
                        initialValue: creativeTranslations.assets['setting-neo-kyoto'] || 'Default setting description for world-building'
                    }
                ],
                aiModelId: crGpt4o.id,
                activeInEnvironments: [{ id: devEnvironment.id }]
            }
        ];

    for (const promptData of creativeProjectPrompts) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptData.id, projectId: crProjectId } },
            update: {
                name: promptData.name,
                description: promptData.description,
                tags: { connect: getCrTagIds(promptData.tags) }
            },
            create: {
                id: promptData.id,
                name: promptData.name,
                description: promptData.description,
                project: { connect: { id: crProjectId } },
                tags: { connect: getCrTagIds(promptData.tags) },
            },
        });
        console.log(`Upserted Prompt: ${prompt.name} (ID: ${prompt.id}) in project ${crProjectId}`);

        if (promptData.assets) {
            for (const assetInfo of promptData.assets) {
                const asset = await prisma.promptAsset.upsert({
                    where: {
                        prompt_asset_key_unique: {
                            promptId: prompt.id,
                            projectId: crProjectId,
                            key: assetInfo.key,
                        }
                    },
                    update: {},
                    create: {
                        key: assetInfo.key,
                        promptId: prompt.id,
                        projectId: crProjectId,
                    },
                    include: { versions: true }
                });

                let version = asset.versions?.find(v => v.versionTag === 'v1.0.0');
                if (!version) {
                    version = await prisma.promptAssetVersion.create({
                        data: {
                            assetId: asset.id,
                            value: assetInfo.initialValue,
                            versionTag: 'v1.0.0',
                            status: 'active',
                            changeMessage: assetInfo.initialChangeMessage || `Initial version of ${assetInfo.name}`
                        }
                    });
                    console.log(`Created initial version for asset ${asset.key} in prompt ${prompt.id}`);
                } else if (version.value !== assetInfo.initialValue) {
                    await prisma.promptAssetVersion.update({
                        where: { id: version.id },
                        data: { value: assetInfo.initialValue, changeMessage: `Updated initial value for ${assetInfo.name} during seed` }
                    });
                    console.log(`Updated initial version for asset ${asset.key} in prompt ${prompt.id}`);
                }
            }
        }

        await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptData.promptText,
                status: 'active',
                changeMessage: `Initial version for ${promptData.name}. (Updated via upsert)`,
                activeInEnvironments: { set: promptData.activeInEnvironments || [{ id: devEnvironment.id }] },
                aiModelId: promptData.aiModelId || crGpt4o.id
            },
            create: {
                promptId: prompt.id,
                promptText: promptData.promptText,
                versionTag: 'v1.0.0', status: 'active',
                changeMessage: `Initial version for ${promptData.name}.`,
                activeInEnvironments: { connect: promptData.activeInEnvironments || [{ id: devEnvironment.id }] },
                aiModelId: promptData.aiModelId || crGpt4o.id
            },
        });
        console.log(`Upserted PromptVersion for ${prompt.name} V1`);
    }

    await createSpanishTranslations(crProjectId);
    console.log(`Finished seeding Creative Writing & Adaptation.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });