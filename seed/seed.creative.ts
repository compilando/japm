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

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Find necessary base data
    const defaultProjectId = 'default-project'; // Assuming the default project ID
    const devEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'development', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });

    const creativeProject = await prisma.project.upsert({
        where: { id: 'sci-fi-novel-project' },
        update: { name: 'Project Chimera - Sci-Fi Novel', description: 'Developing concepts and drafts for a new science fiction novel.', owner: { connect: { id: testUser.id } } }, // use owner connect
        create: {
            id: 'sci-fi-novel-project',
            name: 'Project Chimera - Sci-Fi Novel',
            description: 'Developing concepts and drafts for a new science fiction novel.',
            owner: { connect: { id: testUser.id } } // use owner connect
        },
    });
    console.log(`Created Project: ${creativeProject.name}`);

    // Add prefix to tags
    const crProjectId = creativeProject.id;
    const crPrefix = 'cr_';
    const crBaseTags = ['creative-writing', 'sci-fi', 'character-dev', 'world-building', 'dialogue', 'plot-outline', 'adaptation'];
    const crTagsToConnect: { name: string }[] = [];

    for (const baseTagName of crBaseTags) {
        const tagName = `${crPrefix}${baseTagName}`;
        const existingTag = await prisma.tag.findUnique({ where: { name: tagName } });

        if (existingTag) {
            if (existingTag.projectId !== crProjectId) {
                await prisma.tag.update({ where: { id: existingTag.id }, data: { projectId: crProjectId } });
                console.log(`Updated Tag: ${tagName} project link to ${crProjectId}`);
            }
        } else {
            await prisma.tag.create({ data: { name: tagName, projectId: crProjectId } });
            console.log(`Created Tag: ${tagName} for project ${crProjectId}`);
        }
        crTagsToConnect.push({ name: tagName });
    }

    // --- Creative Assets ---
    const assetMainChar = await prisma.promptAsset.create({ data: { key: 'main-char-profile-jax', name: 'Main Character Profile - Jax', type: 'Character', projectId: creativeProject.id } }); // Use direct projectId
    const assetMainCharV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetMainChar.key, value: 'Jax: Ex-military cyborg, cynical but skilled pilot. Haunted by past mission. Distrusts authority. Has a cybernetic arm with hidden tools. Motivation: Find his missing sister.', versionTag: 'v1.0.0', status: 'active' } });

    const assetSetting = await prisma.promptAsset.create({ data: { key: 'setting-neo-kyoto', name: 'Setting Description - Neo-Kyoto', type: 'Setting', projectId: creativeProject.id } }); // Use direct projectId
    const assetSettingV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetSetting.key, value: 'Neo-Kyoto, 2242: A sprawling, rain-slicked metropolis dominated by mega-corporations. Holographic ads flicker on towering skyscrapers. Lower levels are dangerous, filled with black markets and cyber-gangs. Upper levels are pristine but sterile.', versionTag: 'v1.0.0', status: 'active' } });

    const assetTone = await prisma.promptAsset.create({ data: { key: 'narrative-tone-noir', name: 'Narrative Tone - Cyberpunk Noir', type: 'Style', projectId: creativeProject.id } }); // Use direct projectId
    const assetToneV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetTone.key, value: 'Maintain a gritty, noir tone. Focus on atmosphere, shadows, rain, moral ambiguity. Use descriptive language that emphasizes the contrast between high-tech and societal decay.', versionTag: 'v1.0.0', status: 'active' } });
    console.log('Created Creative Assets and V1 Versions');

    // --- Creative Prompt: Generate Scene ---
    const promptGenScene = await prisma.prompt.create({
        data: {
            name: 'generate-scene-dialogue',
            description: 'Generate a scene with dialogue between characters.',
            projectId: creativeProject.id, // Use direct projectId
            tags: { connect: crTagsToConnect.filter(t => ['cr_creative-writing', 'cr_sci-fi', 'cr_dialogue'].includes(t.name)) } // Connect prefixed tags
        }
    });

    const promptGenSceneV1 = await prisma.promptVersion.create({
        data: {
            promptId: promptGenScene.name, // Use direct promptId
            promptText: `Write a short scene (approx. 300 words) set in {{setting-neo-kyoto}}.
            Characters involved: {{main-char-profile-jax}} and {{Secondary Character Description}}.
            Scene Goal: {{Scene Goal / Conflict}}.
            Dialogue should reflect the characters' personalities and the {{narrative-tone-noir}}.
            Focus on showing, not telling. Include brief descriptions of actions and environment.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating dialogue scenes.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }] } // Connect using env ID
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