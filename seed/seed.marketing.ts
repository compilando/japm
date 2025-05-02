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

    const marketingProject = await prisma.project.upsert({
        where: { id: 'marketing-content-gen' },
        update: { name: 'Marketing Content Generation', description: 'Prompts for generating various marketing materials.' },
        create: {
            id: 'marketing-content-gen',
            name: 'Marketing Content Generation',
            description: 'Prompts for generating various marketing materials.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Upserted Project: ${marketingProject.name}`);

    const marketingTags = ['marketing', 'social-media', 'blog-post', 'email-campaign', 'seo'];
    for (const tagName of marketingTags) {
        await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
        console.log(`Upserted Tag: ${tagName}`);
    }

    // --- Marketing Assets (Using upsert) ---
    const assetAudience = await prisma.promptAsset.upsert({
        where: { key: 'target-audience-persona' },
        update: { name: 'Target Audience Persona', type: 'Text Template', project: { connect: { id: marketingProject.id } } },
        create: { key: 'target-audience-persona', name: 'Target Audience Persona', type: 'Text Template', project: { connect: { id: marketingProject.id } } }
    });
    const assetAudienceV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetAudience.key, versionTag: 'v1.0.0' } },
        update: { value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]', status: 'active' },
        create: { asset: { connect: { key: assetAudience.key } }, value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]', versionTag: 'v1.0.0', status: 'active' }
    });

    const assetCTA = await prisma.promptAsset.upsert({
        where: { key: 'call-to-action-phrases' },
        update: { name: 'Call to Action Phrases', type: 'List', project: { connect: { id: marketingProject.id } } },
        create: { key: 'call-to-action-phrases', name: 'Call to Action Phrases', type: 'List', project: { connect: { id: marketingProject.id } } }
    });
    const assetCTAV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetCTA.key, versionTag: 'v1.0.0' } },
        update: { value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide', status: 'active' },
        create: { asset: { connect: { key: assetCTA.key } }, value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide', versionTag: 'v1.0.0', status: 'active' }
    });
    console.log('Upserted Marketing Assets and V1 Versions');

    // --- Marketing Prompt: Generate Blog Post Idea ---
    const promptBlogPostIdea = await prisma.prompt.upsert({
        where: { name: 'generate-blog-post-idea' },
        update: { description: 'Generate blog post ideas for a target audience.', project: { connect: { id: marketingProject.id } }, tags: { connect: [{ name: 'marketing' }, { name: 'blog-post' }] } },
        create: {
            name: 'generate-blog-post-idea',
            description: 'Generate blog post ideas for a target audience.',
            project: { connect: { id: marketingProject.id } },
            tags: { connect: [{ name: 'marketing' }, { name: 'blog-post' }] }
        }
    });

    const promptBlogPostIdeaV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptBlogPostIdea.name, versionTag: 'v1.0.0' } },
        update: { status: 'active' },
        create: {
            prompt: { connect: { name: promptBlogPostIdea.name } },
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating blog post ideas.',
            activeInEnvironments: { connect: [{ name: 'development' }] }
        }
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