import { PrismaClient, MarketplacePublishStatus, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Traducciones específicas para el proyecto de marketing
const marketingTranslations = {
    assets: {
        'brand-voice-eco': `Comunicación auténtica y transparente. Enfócate en la sostenibilidad y el impacto ambiental. Usa un tono optimista pero realista. Evita el greenwashing y las exageraciones.`,
        'target-audience-millennials': `Describe the target audience:
- Demographics: [Age, Location, Income]
- Interests: [Hobbies, Media Consumption]
- Pain Points: [Challenges, Needs]`,
        'social-media-tone': `Learn More
Shop Now
Sign Up Today
Download Free Guide`
    },
    prompts: {
        'generate-social-post': `Generate 5 blog post ideas relevant to the following target audience:
{{target-audience-persona}}

Focus on topics related to: {{Topic Focus}}

Ensure the ideas are engaging and SEO-friendly.`,
        'create-email-campaign': `Create an email marketing campaign with the following characteristics:

Audience: {audience}
Objective: {objective}
Topic: {topic}

The campaign should include:
- Email subject
- Subject line
- Email body
- Call to action
- Suggested segmentation

Optimize for engagement and conversion.`,
        'brand-messaging': `Develop brand messages for the following initiative:

Initiative: {initiative}
Audience: {audience}
Channel: {channel}

The messages should include:
- Value proposition
- Key benefits
- Call to action
- Tone of voice

Align with brand strategy.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);

    // Obtener todas las promptversion y promptassetversion del proyecto
    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        include: {
            prompt: true
        }
    });

    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: {
            asset: {
                projectId: projectId
            }
        },
        include: {
            asset: true
        }
    });

    // Crear traducciones para promptversion
    for (const version of promptVersions) {
        const translation = marketingTranslations.prompts[version.prompt.id] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: {
                versionId_languageCode: {
                    versionId: version.id,
                    languageCode: 'es-ES'
                }
            },
            update: {
                promptText: translation
            },
            create: {
                versionId: version.id,
                languageCode: 'es-ES',
                promptText: translation
            }
        });
        console.log(`Created Spanish translation for prompt version ${version.id}`);
    }

    // Crear traducciones para promptassetversion
    for (const version of promptAssetVersions) {
        const translation = marketingTranslations.assets[version.asset.key] || version.value;
        await prisma.assetTranslation.upsert({
            where: {
                versionId_languageCode: {
                    versionId: version.id,
                    languageCode: 'es-ES'
                }
            },
            update: {
                value: translation
            },
            create: {
                versionId: version.id,
                languageCode: 'es-ES',
                value: translation
            }
        });
        console.log(`Created Spanish translation for prompt asset version ${version.id}`);
    }

    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

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

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: { role: Role.TENANT_ADMIN }, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } }, role: Role.TENANT_ADMIN } });
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
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
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
            value: `Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]`,
            status: 'active',
            changeMessage: audienceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetAudience.id,
            value: `Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: audienceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        select: { id: true }
    });
    console.log(`Upserted AssetVersion ${assetAudience.key} v1.0.0 with Marketplace Status: PENDING_APPROVAL`);

    const brandVoiceAssetName = 'Brand Voice Eco';
    const assetBrandVoice = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: marketingProject.id,
                key: 'brand-voice-eco'
            }
        },
        update: {},
        create: {
            key: 'brand-voice-eco',
            projectId: marketingProject.id
        }
    });
    const assetBrandVoiceV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetBrandVoice.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Comunicación auténtica y transparente. Enfócate en la sostenibilidad y el impacto ambiental. Usa un tono optimista pero realista. Evita el greenwashing y las exageraciones.`,
            status: 'active',
            changeMessage: brandVoiceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(), // Simulate approval
            marketplaceApproverId: testUser.id, // Simulate self-approval or admin
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetBrandVoice.id,
            value: `Comunicación auténtica y transparente. Enfócate en la sostenibilidad y el impacto ambiental. Usa un tono optimista pero realista. Evita el greenwashing y las exageraciones.`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: brandVoiceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(), // Simulate approval
            marketplaceApproverId: testUser.id, // Simulate self-approval or admin
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted AssetVersion ${assetBrandVoice.key} v1.0.0 with Marketplace Status: PUBLISHED`);

    const smToneAssetName = 'Social Media Tone & CTAs'; // Nombre corregido/aclarado
    const assetSMTone = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: marketingProject.id,
                key: 'social-media-tone'
            }
        },
        update: {},
        create: {
            key: 'social-media-tone',
            projectId: marketingProject.id
        }
    });
    const assetSMToneV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetSMTone.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Learn More\nShop Now\nSign Up Today\nDownload Free Guide`,
            status: 'active',
            changeMessage: smToneAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetSMTone.id,
            value: `Learn More\nShop Now\nSign Up Today\nDownload Free Guide`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: smToneAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted AssetVersion ${assetSMTone.key} v1.0.0 with Marketplace Status: NOT_PUBLISHED`);

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

    // --- Upsert Marketing Prompt: Generate Social Media Post --- 
    const socialPostName = 'Generate Social Media Post';
    const promptSocialPost = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: slugify(socialPostName),
                projectId: marketingProject.id
            }
        },
        update: {
            name: socialPostName,
            description: 'Generate social media posts for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'social-media']) }
        },
        create: {
            id: slugify(socialPostName),
            name: socialPostName,
            description: 'Generate social media posts for a target audience.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'social-media']) }
        },
        select: { id: true, name: true }
    });

    const promptSocialPostV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptSocialPost.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            aiModelId: mktGpt4oMini.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for social media post generation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            promptId: promptSocialPost.id,
            versionTag: 'v1.0.0',
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            aiModelId: mktGpt4oMini.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for social media post generation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted PromptVersion ${promptSocialPost.id} v1.0.0 with Marketplace Status: PENDING_APPROVAL`);

    // --- Upsert Marketing Prompt: Create Email Campaign --- 
    const emailCampaignName = 'Create Email Campaign';
    const promptEmailCampaign = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: slugify(emailCampaignName),
                projectId: marketingProject.id
            }
        },
        update: {
            name: emailCampaignName,
            description: 'Create an email marketing campaign for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'email-campaign']) }
        },
        create: {
            id: slugify(emailCampaignName),
            name: emailCampaignName,
            description: 'Create an email marketing campaign for a target audience.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'email-campaign']) }
        },
        select: { id: true, name: true }
    });

    const promptEmailCampaignV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptEmailCampaign.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Create an email marketing campaign with the following characteristics:\n\nAudience: {audience}\nObjective: {objective}\nTopic: {topic}\n\nThe campaign should include:\n- Email subject\n- Subject line\n- Email body\n- Call to action\n- Suggested segmentation\n\nOptimize for engagement and conversion.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for email campaign creation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        create: {
            promptId: promptEmailCampaign.id,
            versionTag: 'v1.0.0',
            promptText: `Create an email marketing campaign with the following characteristics:\n\nAudience: {audience}\nObjective: {objective}\nTopic: {topic}\n\nThe campaign should include:\n- Email subject\n- Subject line\n- Email body\n- Call to action\n- Suggested segmentation\n\nOptimize for engagement and conversion.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for email campaign creation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted PromptVersion ${promptEmailCampaign.id} v1.0.0 with Marketplace Status: PUBLISHED`);

    // --- Upsert Marketing Prompt: Develop Brand Messaging --- 
    const brandMessagingName = 'Develop Brand Messaging';
    const promptBrandMessaging = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: slugify(brandMessagingName),
                projectId: marketingProject.id
            }
        },
        update: {
            name: brandMessagingName,
            description: 'Develop brand messages for a specific initiative.',
            tags: { set: getMktTagIds(['marketing', 'brand-messaging']) }
        },
        create: {
            id: slugify(brandMessagingName),
            name: brandMessagingName,
            description: 'Develop brand messages for a specific initiative.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'brand-messaging']) }
        },
        select: { id: true, name: true }
    });

    const promptBrandMessagingV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptBrandMessaging.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Develop brand messages for the following initiative:\n\nInitiative: {initiative}\nAudience: {audience}\nChannel: {channel}\n\nThe messages should include:\n- Value proposition\n- Key benefits\n- Call to action\n- Tone of voice\n\nAlign with brand strategy.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for brand messaging development',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            promptId: promptBrandMessaging.id,
            versionTag: 'v1.0.0',
            promptText: `Develop brand messages for the following initiative:\n\nInitiative: {initiative}\nAudience: {audience}\nChannel: {channel}\n\nThe messages should include:\n- Value proposition\n- Key benefits\n- Call to action\n- Tone of voice\n\nAlign with brand strategy.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for brand messaging development',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted PromptVersion ${promptBrandMessaging.id} v1.0.0 with Marketplace Status: NOT_PUBLISHED`);

    // Crear traducciones es-ES para los assets y prompts
    await createSpanishTranslations(marketingProject.id);

    console.log(`Marketing & Content Creation seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });