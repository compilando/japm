import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Definición de la función slugify (copiada de otros seeds)
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
        where: { id: 'marketing-content-project' },
        update: { name: 'Marketing Content Generation', description: 'AI-powered marketing content generation and optimization.', ownerUserId: testUser.id },
        create: {
            id: 'marketing-content-project',
            name: 'Marketing Content Generation',
            description: 'AI-powered marketing content generation and optimization.',
            owner: { connect: { id: testUser.id } }
        },
    });
    console.log(`Upserted Project: ${marketingProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto Marketing
    await createSpanishRegionAndCulturalData(marketingProject.id);
    // Crear región en-US y datos culturales para el proyecto Marketing
    await createUSRegionAndCulturalData(marketingProject.id);

    // Create specific AI models for this project
    const mktGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: marketingProject.id, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: marketingProject.id, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const mktGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: marketingProject.id, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: marketingProject.id, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${marketingProject.id}`);

    // Upsert Marketing Tags with prefix
    const mktPrefix = 'mkt_';
    const mktBaseTags = ['marketing', 'social-media', 'blog-post', 'email-campaign', 'seo'];
    const mktTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of mktBaseTags) {
        const tagName = `${mktPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: marketingProject.id, name: tagName } },
            update: {}, // No specific fields to update
            create: { name: tagName, projectId: marketingProject.id },
            select: { id: true } // Select ID
        });
        mktTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${marketingProject.id}`);
    }
    // Helper function to get tag IDs
    const getMktTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => mktTagMap.get(`${mktPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // --- Upsert Marketing Assets --- 
    const audienceAssetName = 'Target Audience Persona';
    const assetAudience = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: marketingProject.id,
                key: 'target-audience-persona'
            }
        },
        update: {},
        create: {
            key: 'target-audience-persona',
            projectId: marketingProject.id
        }
    });
    const assetAudienceV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetAudience.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]',
            status: 'active',
            changeMessage: audienceAssetName
        },
        create: {
            assetId: assetAudience.id,
            value: 'Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: audienceAssetName
        },
        select: { id: true }
    });

    const ctaAssetName = 'Call to Action Phrases';
    const assetCTA = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: marketingProject.id,
                key: 'call-to-action-phrases'
            }
        },
        update: {},
        create: {
            key: 'call-to-action-phrases',
            projectId: marketingProject.id
        }
    });
    const assetCTAV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetCTA.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide',
            status: 'active',
            changeMessage: ctaAssetName
        },
        create: {
            assetId: assetCTA.id,
            value: 'Learn More\nShop Now\nSign Up Today\nDownload Free Guide',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: ctaAssetName
        },
        select: { id: true }
    });
    console.log('Upserted Marketing Assets and V1 Versions');

    // --- Upsert Marketing Prompt: Generate Blog Post Idea --- 
    const promptBlogPostIdeaName = 'generate-blog-post-idea';
    const promptBlogPostIdeaSlug = slugify(promptBlogPostIdeaName);
    const promptBlogPostIdea = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: promptBlogPostIdeaSlug,
                projectId: marketingProject.id
            }
        },
        update: {
            name: promptBlogPostIdeaName,
            description: 'Generate blog post ideas for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'blog-post']) }
        },
        create: {
            id: promptBlogPostIdeaSlug,
            name: promptBlogPostIdeaName,
            description: 'Generate blog post ideas for a target audience.',
            projectId: marketingProject.id,
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

    console.log(`Marketing Content seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });