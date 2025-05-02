import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Creative Writing & Adaptation...`);
    console.log('Assuming prior cleanup...');

    const testUser = await prisma.user.upsert({ /* ... */ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Assume Models, Environments created

    const creativeProject = await prisma.project.upsert({
        where: { id: 'sci-fi-novel-project' },
        update: { name: 'Project Chimera - Sci-Fi Novel', description: 'Developing concepts and drafts for a new science fiction novel.' },
        create: {
            id: 'sci-fi-novel-project',
            name: 'Project Chimera - Sci-Fi Novel',
            description: 'Developing concepts and drafts for a new science fiction novel.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Created Project: ${creativeProject.name}`);

    const creativeTags = ['creative-writing', 'sci-fi', 'character-dev', 'world-building', 'dialogue', 'plot-outline', 'adaptation'];
    for (const tagName of creativeTags) {
        await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
        console.log(`Upserted Tag: ${tagName}`);
    }

    // --- Creative Assets ---
    const assetMainChar = await prisma.promptAsset.create({ data: { key: 'main-char-profile-jax', name: 'Main Character Profile - Jax', type: 'Character', project: { connect: { id: creativeProject.id } } } });
    const assetMainCharV1 = await prisma.promptAssetVersion.create({ data: { asset: { connect: { key: assetMainChar.key } }, value: 'Jax: Ex-military cyborg, cynical but skilled pilot. Haunted by past mission. Distrusts authority. Has a cybernetic arm with hidden tools. Motivation: Find his missing sister.', versionTag: 'v1.0.0', status: 'active' } });

    const assetSetting = await prisma.promptAsset.create({ data: { key: 'setting-neo-kyoto', name: 'Setting Description - Neo-Kyoto', type: 'Setting', project: { connect: { id: creativeProject.id } } } });
    const assetSettingV1 = await prisma.promptAssetVersion.create({ data: { asset: { connect: { key: assetSetting.key } }, value: 'Neo-Kyoto, 2242: A sprawling, rain-slicked metropolis dominated by mega-corporations. Holographic ads flicker on towering skyscrapers. Lower levels are dangerous, filled with black markets and cyber-gangs. Upper levels are pristine but sterile.', versionTag: 'v1.0.0', status: 'active' } });

    const assetTone = await prisma.promptAsset.create({ data: { key: 'narrative-tone-noir', name: 'Narrative Tone - Cyberpunk Noir', type: 'Style', project: { connect: { id: creativeProject.id } } } });
    const assetToneV1 = await prisma.promptAssetVersion.create({ data: { asset: { connect: { key: assetTone.key } }, value: 'Maintain a gritty, noir tone. Focus on atmosphere, shadows, rain, moral ambiguity. Use descriptive language that emphasizes the contrast between high-tech and societal decay.', versionTag: 'v1.0.0', status: 'active' } });
    console.log('Created Creative Assets and V1 Versions');

    // --- Creative Prompt: Generate Scene ---
    const promptGenScene = await prisma.prompt.create({
        data: {
            name: 'generate-scene-dialogue',
            description: 'Generate a scene with dialogue between characters.',
            project: { connect: { id: creativeProject.id } },
            tags: { connect: [{ name: 'creative-writing' }, { name: 'sci-fi' }, { name: 'dialogue' }] }
        }
    });

    const promptGenSceneV1 = await prisma.promptVersion.create({
        data: {
            prompt: { connect: { name: promptGenScene.name } },
            promptText: `Write a short scene (approx. 300 words) set in {{setting-neo-kyoto}}.
            Characters involved: {{main-char-profile-jax}} and {{Secondary Character Description}}.
            Scene Goal: {{Scene Goal / Conflict}}.
            Dialogue should reflect the characters' personalities and the {{narrative-tone-noir}}.
            Focus on showing, not telling. Include brief descriptions of actions and environment.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating dialogue scenes.',
            activeInEnvironments: { connect: [{ name: 'development' }] }
        }
    });
    console.log(`Created Prompt ${promptGenScene.name} V1`);

    await prisma.promptAssetLink.createMany({
        data: [
            { promptVersionId: promptGenSceneV1.id, assetVersionId: assetSettingV1.id, usageContext: 'Setting context for the scene' },
            { promptVersionId: promptGenSceneV1.id, assetVersionId: assetMainCharV1.id, usageContext: 'Primary character details for AI' },
            { promptVersionId: promptGenSceneV1.id, assetVersionId: assetToneV1.id, usageContext: 'Stylistic instructions for narrative tone' },
            // Note: Secondary Character, Scene Goal filled dynamically by the writer.
        ]
    });
    console.log(`Linked assets to ${promptGenScene.name} V1`);

    // --- Creative Prompt: Adapt Content ---
    // ... (Add another prompt, e.g., "adapt-chapter-summary-to-logline")

    console.log(`Creative Writing & Adaptation seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });