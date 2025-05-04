import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

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

    // Upsert Marketing Project
    const marketingProject = await prisma.project.upsert({
        where: { id: 'marketing-content-gen' },
        update: { name: 'Marketing Content Generation', description: 'Prompts for generating various marketing materials.', ownerUserId: testUser.id }, // Update ownerUserId
        create: {
            id: 'marketing-content-gen',
            name: 'Marketing Content Generation',
            description: 'Prompts for generating various marketing materials.',
            owner: { connect: { id: testUser.id } }, // Connect owner on create
        },
    });
    console.log(`Upserted Project: ${marketingProject.name}`);
    const mktProjectId = marketingProject.id;

    // Create specific AI models for this project
    const mktGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: mktProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: mktProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const mktGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: mktProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: mktProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    const mktClaudeOpus = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: mktProjectId, name: 'claude-3-opus-20240229' } },
        update: { provider: 'Anthropic', apiKeyEnvVar: 'ANTHROPIC_API_KEY', temperature: 0.3 },
        create: { projectId: mktProjectId, name: 'claude-3-opus-20240229', provider: 'Anthropic', apiKeyEnvVar: 'ANTHROPIC_API_KEY', temperature: 0.3 },
        select: { id: true }
    });
    const mktClaudeHaiku = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: mktProjectId, name: 'claude-3-haiku-20240307' } },
        update: { provider: 'Anthropic', apiKeyEnvVar: 'ANTHROPIC_API_KEY', temperature: 0.8 },
        create: { projectId: mktProjectId, name: 'claude-3-haiku-20240307', provider: 'Anthropic', apiKeyEnvVar: 'ANTHROPIC_API_KEY', temperature: 0.8 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${mktProjectId}`);

    // Upsert Marketing Tags with prefix
    const mktPrefix = 'mkt_';
    const mktBaseTags = ['marketing', 'social-media', 'blog-post', 'email-campaign', 'seo'];
    const mktTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of mktBaseTags) {
        const tagName = `${mktPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: mktProjectId, name: tagName } },
            update: {}, // No specific fields to update
            create: { name: tagName, projectId: mktProjectId },
            select: { id: true } // Select ID
        });
        mktTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${mktProjectId}`);
    }
    // Helper function to get tag IDs
    const getMktTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => mktTagMap.get(`${mktPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // --- Upsert Marketing Assets --- 
    const assetAudience = await prisma.promptAsset.upsert({
        where: { key: 'target-audience-persona' },
        update: { name: 'Target Audience Persona', type: 'Text Template', projectId: mktProjectId },
        create: { key: 'target-audience-persona', name: 'Target Audience Persona', type: 'Text Template', projectId: mktProjectId }
    });
    const assetAudienceV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetAudience.key, versionTag: 'v1.0.0' } },
        update: { value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]', status: 'active' },
        create: { assetId: assetAudience.key, value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });

    const assetCTA = await prisma.promptAsset.upsert({
        where: { key: 'call-to-action-phrases' },
        update: { name: 'Call to Action Phrases', type: 'List', projectId: mktProjectId },
        create: { key: 'call-to-action-phrases', name: 'Call to Action Phrases', type: 'List', projectId: mktProjectId }
    });
    const assetCTAV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetCTA.key, versionTag: 'v1.0.0' } },
        update: { value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide', status: 'active' },
        create: { assetId: assetCTA.key, value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });
    console.log('Upserted Marketing Assets and V1 Versions');

    // --- Upsert Marketing Prompt: Generate Blog Post Idea --- 
    const promptBlogPostIdeaName = 'generate-blog-post-idea';
    const promptBlogPostIdea = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: mktProjectId, name: promptBlogPostIdeaName } },
        update: {
            description: 'Generate blog post ideas for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'blog-post']) }
        },
        create: {
            name: promptBlogPostIdeaName,
            description: 'Generate blog post ideas for a target audience.',
            projectId: mktProjectId,
            tags: { connect: getMktTagIds(['marketing', 'blog-post']) }
        },
        select: { id: true, name: true }
    });

    const promptBlogPostIdeaV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptBlogPostIdea.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: devEnvironment.id }] },
            aiModelId: mktGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptBlogPostIdea.id,
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating blog post ideas.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }] },
            aiModelId: mktGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptBlogPostIdea.name} V1`);

    // Upsert Link
    await prisma.promptAssetLink.upsert({
        where: { promptVersionId_assetVersionId: { promptVersionId: promptBlogPostIdeaV1.id, assetVersionId: assetAudienceV1.id } },
        update: { usageContext: 'Target audience definition' },
        create: { promptVersionId: promptBlogPostIdeaV1.id, assetVersionId: assetAudienceV1.id, usageContext: 'Target audience definition' },
    });
    console.log(`Upserted link for ${promptBlogPostIdea.name} V1`);

    console.log(`Marketing Content seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });