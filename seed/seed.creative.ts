import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Creative Writing & Adaptation...`);
    console.log('Assuming prior cleanup...');

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Find necessary base data
    const defaultProjectId = 'default-project'; // Assuming the default project ID
    const devEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'development', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });

    const creativeProject = await prisma.project.upsert({
        where: { id: 'sci-fi-novel-project' },
        update: { name: 'Project Chimera - Sci-Fi Novel', description: 'Developing concepts and drafts for a new science fiction novel.', ownerUserId: testUser.id }, // use owner connect
        create: {
            id: 'sci-fi-novel-project',
            name: 'Project Chimera - Sci-Fi Novel',
            description: 'Developing concepts and drafts for a new science fiction novel.',
            owner: { connect: { id: testUser.id } } // use owner connect
        },
    });
    console.log(`Upserted Project: ${creativeProject.name}`);

    // Create specific AI models for this project
    const crProjectId = creativeProject.id;
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

    // Upsert Creative Tags with prefix
    const crPrefix = 'cr_';
    const crBaseTags = ['creative-writing', 'sci-fi', 'character-dev', 'world-building', 'dialogue', 'plot-outline', 'adaptation'];
    const crTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of crBaseTags) {
        const tagName = `${crPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: crProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: crProjectId },
            select: { id: true }
        });
        crTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${crProjectId}`);
    }
    // Helper function to get tag IDs
    const getCrTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => crTagMap.get(`${crPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // --- Upsert Creative Assets ---
    const assetMainChar = await prisma.promptAsset.upsert({
        where: { key: 'main-char-profile-jax' },
        update: { name: 'Main Character Profile - Jax', type: 'Character', projectId: crProjectId },
        create: { key: 'main-char-profile-jax', name: 'Main Character Profile - Jax', type: 'Character', projectId: crProjectId }
    });
    const assetMainCharV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetMainChar.key, versionTag: 'v1.0.0' } },
        update: { value: 'Jax: Ex-military cyborg, cynical but skilled pilot. Haunted by past mission. Distrusts authority. Has a cybernetic arm with hidden tools. Motivation: Find his missing sister.', status: 'active' },
        create: { assetId: assetMainChar.key, value: 'Jax: Ex-military cyborg, cynical but skilled pilot. Haunted by past mission. Distrusts authority. Has a cybernetic arm with hidden tools. Motivation: Find his missing sister.', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true } // Select ID
    });

    const assetSetting = await prisma.promptAsset.upsert({
        where: { key: 'setting-neo-kyoto' },
        update: { name: 'Setting Description - Neo-Kyoto', type: 'Setting', projectId: crProjectId },
        create: { key: 'setting-neo-kyoto', name: 'Setting Description - Neo-Kyoto', type: 'Setting', projectId: crProjectId }
    });
    const assetSettingV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetSetting.key, versionTag: 'v1.0.0' } },
        update: { value: 'Neo-Kyoto, 2242: A sprawling, rain-slicked metropolis dominated by mega-corporations. Holographic ads flicker on towering skyscrapers. Lower levels are dangerous, filled with black markets and cyber-gangs. Upper levels are pristine but sterile.', status: 'active' },
        create: { assetId: assetSetting.key, value: 'Neo-Kyoto, 2242: A sprawling, rain-slicked metropolis dominated by mega-corporations. Holographic ads flicker on towering skyscrapers. Lower levels are dangerous, filled with black markets and cyber-gangs. Upper levels are pristine but sterile.', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true } // Select ID
    });

    const assetTone = await prisma.promptAsset.upsert({
        where: { key: 'narrative-tone-noir' },
        update: { name: 'Narrative Tone - Cyberpunk Noir', type: 'Style', projectId: crProjectId },
        create: { key: 'narrative-tone-noir', name: 'Narrative Tone - Cyberpunk Noir', type: 'Style', projectId: crProjectId }
    });
    const assetToneV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetTone.key, versionTag: 'v1.0.0' } },
        update: { value: 'Maintain a gritty, noir tone. Focus on atmosphere, shadows, rain, moral ambiguity. Use descriptive language that emphasizes the contrast between high-tech and societal decay.', status: 'active' },
        create: { assetId: assetTone.key, value: 'Maintain a gritty, noir tone. Focus on atmosphere, shadows, rain, moral ambiguity. Use descriptive language that emphasizes the contrast between high-tech and societal decay.', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true } // Select ID
    });
    console.log('Upserted Creative Assets and V1 Versions');

    // --- Upsert Creative Prompt: Generate Scene ---
    const promptGenSceneName = 'generate-scene-dialogue';
    const promptGenScene = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: crProjectId, name: promptGenSceneName } }, // Use correct name
        update: {
            description: 'Generate a scene with dialogue between characters.',
            tags: { set: getCrTagIds(['creative-writing', 'sci-fi', 'dialogue']) } // Use helper
        },
        create: {
            name: promptGenSceneName, // Use correct name
            description: 'Generate a scene with dialogue between characters.',
            projectId: crProjectId,
            tags: { connect: getCrTagIds(['creative-writing', 'sci-fi', 'dialogue']) } // Use helper
        },
        select: { id: true, name: true } // Select needed fields
    });

    const promptGenSceneV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenScene.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Write a short scene (approx. 300 words) set in {{setting-neo-kyoto}}.\n            Characters involved: {{main-char-profile-jax}} and {{Secondary Character Description}}.\n            Scene Goal: {{Scene Goal / Conflict}}.\n            Dialogue should reflect the characters\' personalities and the {{narrative-tone-noir}}.\n            Focus on showing, not telling. Include brief descriptions of actions and environment.`,
            status: 'active',
            changeMessage: 'Initial prompt for generating dialogue scenes. (Updated via upsert)',
            activeInEnvironments: { set: [{ id: devEnvironment.id }] }, // Use set for update
            aiModelId: crGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptGenScene.id,
            promptText: `Write a short scene (approx. 300 words) set in {{setting-neo-kyoto}}.\n            Characters involved: {{main-char-profile-jax}} and {{Secondary Character Description}}.\n            Scene Goal: {{Scene Goal / Conflict}}.\n            Dialogue should reflect the characters\' personalities and the {{narrative-tone-noir}}.\n            Focus on showing, not telling. Include brief descriptions of actions and environment.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating dialogue scenes.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }] },
            aiModelId: crGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptGenScene.name} V1`);

    // Upsert Links individually
    const linksToUpsert = [
        { assetVersionId: assetSettingV1.id, usageContext: 'Setting context for the scene' },
        { assetVersionId: assetMainCharV1.id, usageContext: 'Primary character details for AI' },
        { assetVersionId: assetToneV1.id, usageContext: 'Stylistic instructions for narrative tone' },
        // Note: Secondary Character, Scene Goal filled dynamically by the writer.
    ];

    for (const link of linksToUpsert) {
        await prisma.promptAssetLink.upsert({
            where: { promptVersionId_assetVersionId: { promptVersionId: promptGenSceneV1.id, assetVersionId: link.assetVersionId } },
            update: { usageContext: link.usageContext },
            create: { promptVersionId: promptGenSceneV1.id, assetVersionId: link.assetVersionId, usageContext: link.usageContext },
        });
    }
    console.log(`Upserted links for ${promptGenScene.name} V1`);

    // --- Creative Prompt: Adapt Content --- 
    // ... (Add another prompt, e.g., "adapt-chapter-summary-to-logline")

    console.log(`Creative Writing & Adaptation seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });