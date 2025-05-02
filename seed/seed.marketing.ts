import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Marketing Content...`);
    console.log('Assuming prior cleanup...');

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Find necessary base data
    const defaultProjectId = 'default-project'; // Assuming the default project ID
    const devEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'development', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });

    const marketingProject = await prisma.project.upsert({
        where: { id: 'marketing-content-gen' },
        update: { name: 'Marketing Content Generation', description: 'Prompts for generating various marketing materials.', owner: { connect: { id: testUser.id } } },
        create: {
            id: 'marketing-content-gen',
            name: 'Marketing Content Generation',
            description: 'Prompts for generating various marketing materials.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Upserted Project: ${marketingProject.name}`);
    const mktProjectId = marketingProject.id;

    // Add prefix to tags
    const mktPrefix = 'mkt_';
    const mktBaseTags = ['marketing', 'social-media', 'blog-post', 'email-campaign', 'seo'];
    const mktTagsToConnect: { name: string }[] = [];

    for (const baseTagName of mktBaseTags) {
        const tagName = `${mktPrefix}${baseTagName}`;
        const existingTag = await prisma.tag.findUnique({ where: { name: tagName } });

        if (existingTag) {
            if (existingTag.projectId !== mktProjectId) {
                await prisma.tag.update({ where: { id: existingTag.id }, data: { projectId: mktProjectId } });
                console.log(`Updated Tag: ${tagName} project link to ${mktProjectId}`);
            }
        } else {
            await prisma.tag.create({ data: { name: tagName, projectId: mktProjectId } });
            console.log(`Created Tag: ${tagName} for project ${mktProjectId}`);
        }
        mktTagsToConnect.push({ name: tagName });
    }

    // --- Marketing Assets (Using upsert) ---
    const assetAudience = await prisma.promptAsset.upsert({
        where: { key: 'target-audience-persona' },
        update: { name: 'Target Audience Persona', type: 'Text Template', projectId: mktProjectId },
        create: { key: 'target-audience-persona', name: 'Target Audience Persona', type: 'Text Template', projectId: mktProjectId }
    });
    const assetAudienceV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetAudience.key, versionTag: 'v1.0.0' } },
        update: { value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]', status: 'active' },
        create: { assetId: assetAudience.key, value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]', versionTag: 'v1.0.0', status: 'active' }
    });

    const assetCTA = await prisma.promptAsset.upsert({
        where: { key: 'call-to-action-phrases' },
        update: { name: 'Call to Action Phrases', type: 'List', projectId: mktProjectId },
        create: { key: 'call-to-action-phrases', name: 'Call to Action Phrases', type: 'List', projectId: mktProjectId }
    });
    const assetCTAV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetCTA.key, versionTag: 'v1.0.0' } },
        update: { value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide', status: 'active' },
        create: { assetId: assetCTA.key, value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide', versionTag: 'v1.0.0', status: 'active' }
    });
    console.log('Upserted Marketing Assets and V1 Versions');

    // --- Marketing Prompt: Generate Blog Post Idea ---
    const promptBlogPostIdeaName = 'generate-blog-post-idea';
    const promptBlogPostIdea = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: mktProjectId, name: promptBlogPostIdeaName } },
        update: {
            description: 'Generate blog post ideas for a target audience.',
            tags: { connect: mktTagsToConnect.filter(t => ['mkt_marketing', 'mkt_blog-post'].includes(t.name)) }
        },
        create: {
            id: undefined,
            name: promptBlogPostIdeaName,
            description: 'Generate blog post ideas for a target audience.',
            projectId: mktProjectId,
            tags: { connect: mktTagsToConnect.filter(t => ['mkt_marketing', 'mkt_blog-post'].includes(t.name)) }
        },
        select: { id: true, name: true }
    });

    const promptBlogPostIdeaV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptBlogPostIdea.id, versionTag: 'v1.0.0' } },
        update: { status: 'active', activeInEnvironments: { connect: [{ id: devEnvironment.id }] } },
        create: {
            prompt: { connect: { id: promptBlogPostIdea.id } },
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating blog post ideas.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }] }
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptBlogPostIdea.name} V1`);

    await prisma.promptAssetLink.upsert({
        where: { promptVersionId_assetVersionId: { promptVersionId: promptBlogPostIdeaV1.id, assetVersionId: assetAudienceV1.id } },
        update: { usageContext: 'Target audience definition' },
        create: { promptVersionId: promptBlogPostIdeaV1.id, assetVersionId: assetAudienceV1.id, usageContext: 'Target audience definition' },
    });
    console.log(`Upserted link for ${promptBlogPostIdea.name} V1`);

    console.log(`Marketing Content seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });