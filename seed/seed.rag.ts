import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Traducciones específicas para el proyecto RAG
const ragTranslations = {
    assets: {
        'rag-instructions': `RAG System Instructions:
1. Process documents
2. Extract relevant information
3. Generate embeddings
4. Store in vector database
5. Enable semantic search`,
        'rag-validation-rules': `Validation rules:
1. Documents in supported format
2. Maximum size allowed
3. Non-malicious content
4. Complete metadata
5. Correctly generated embeddings`,
        'rag-error-messages': `Error messages:
- "Unsupported format"
- "Size exceeds limit"
- "Malicious content detected"
- "Incomplete metadata"
- "Embedding generation error"`
    },
    prompts: {
        'process-document': `Process the following document:

Document: {document}

Steps:
1. Validate format
2. Extract text
3. Generate embeddings
4. Store metadata
5. Index content

Ensure all error cases are handled.`,
        'search-documents': `Search in documents:

Query: {query}

Criteria:
1. Semantic relevance
2. Embedding similarity
3. Metadata filters
4. Score sorting
5. Result limit

Return the most relevant documents.`,
        'update-index': `Update the index:

Documents: {documents}

Actions:
1. Verify changes
2. Update embeddings
3. Modify metadata
4. Reindex content
5. Validate consistency

Ensure index integrity is maintained.`
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
        const translation = ragTranslations.prompts[version.prompt.id] || version.promptText;
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
        const translation = ragTranslations.assets[version.asset.key] || version.value;
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
    console.log(`Start seeding for Internal Knowledge Base (RAG)...`);
    console.log('Assuming prior cleanup...');

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });
    // Find necessary base data
    // const defaultProjectId = 'default-project'; // Assuming the default project ID
    // const stagingEnvironment = await prisma.environment.findUniqueOrThrow({
    //     where: { projectId_name: { name: 'staging', projectId: defaultProjectId } }, // Find env in default project
    //     select: { id: true } // Select ID for connecting later
    // });
    // const productionEnvironment = await prisma.environment.findUniqueOrThrow({
    //     where: { projectId_name: { name: 'production', projectId: defaultProjectId } }, // Find env in default project
    //     select: { id: true } // Select ID for connecting later
    // });

    // --- RAG Project ---
    const ragProject = await prisma.project.upsert({
        where: { id: 'internal-hr-assistant' },
        update: { name: 'Internal HR Policy Assistant', description: 'AI assistant to answer employee questions based on HR documents.', ownerUserId: testUser.id },
        create: {
            id: 'internal-hr-assistant',
            name: 'Internal HR Policy Assistant',
            description: 'AI assistant to answer employee questions based on HR documents.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: defaultTenant.id } }
        },
    });
    console.log(`Upserted Project: ${ragProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto RAG
    await createSpanishRegionAndCulturalData(ragProject.id);
    // Crear región en-US y datos culturales para el proyecto RAG
    await createUSRegionAndCulturalData(ragProject.id);

    // Create specific AI models for this project
    const ragProjectId = ragProject.id;

    // Crear Environments para el proyecto RAG
    const ragDevEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: ragProjectId } },
        update: {},
        create: { name: 'development', projectId: ragProjectId, description: 'Development environment for RAG project' },
        select: { id: true }
    });
    const ragStagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: ragProjectId } },
        update: {},
        create: { name: 'staging', projectId: ragProjectId, description: 'Staging environment for RAG project' },
        select: { id: true }
    });
    const ragProdEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: ragProjectId } },
        update: {},
        create: { name: 'production', projectId: ragProjectId, description: 'Production environment for RAG project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${ragProjectId}`);

    const ragGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: ragProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: ragProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const ragGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: ragProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: ragProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${ragProjectId}`);

    // --- Upsert RAG Tags with prefix ---
    const ragPrefix = 'rag_';
    const ragBaseTags = ['rag', 'internal-kb', 'hr-policy', 'employee-faq', 'compliance'];
    const ragTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of ragBaseTags) {
        const tagName = `${ragPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: ragProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: ragProjectId },
            select: { id: true }
        });
        ragTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${ragProjectId}`);
    }
    // Helper function to get tag IDs
    const getRagTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => ragTagMap.get(`${ragPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // Crear un Prompt padre para los assets comunes de RAG
    const ragCommonAssetsPromptSlug = 'rag-common-assets';
    const ragCommonAssetsPrompt = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: ragCommonAssetsPromptSlug,
                projectId: ragProjectId,
            },
        },
        update: { name: 'RAG Common Assets' },
        create: {
            id: ragCommonAssetsPromptSlug,
            name: 'RAG Common Assets',
            description: 'Common reusable assets for RAG prompts.',
            projectId: ragProjectId,
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt for common RAG assets: ${ragCommonAssetsPrompt.id}`);

    // --- Upsert RAG Document Metadata ---
    // Using individual upserts for idempotency
    const metadataToUpsert = [
        { id: 'doc-handbook-v4-2', documentName: 'Employee Handbook v4.2', category: 'HR Policy', complianceReviewed: true, piiRiskLevel: 'Medium', lastReviewedBy: 'HR Compliance Team', projectId: ragProjectId },
        { id: 'doc-remote-policy-2024', documentName: 'Remote Work Policy 2024', category: 'HR Policy', complianceReviewed: true, piiRiskLevel: 'Low', lastReviewedBy: 'HR Compliance Team', projectId: ragProjectId },
        { id: 'doc-benefits-2025', documentName: 'Benefits Guide 2025', category: 'Benefits', complianceReviewed: true, piiRiskLevel: 'High', lastReviewedBy: 'Benefits Team', projectId: ragProjectId },
        { id: 'doc-it-sec-guide', documentName: 'IT Security Guidelines', category: 'IT Policy', complianceReviewed: false, piiRiskLevel: 'Low', lastReviewedBy: 'IT Security', projectId: ragProjectId },
    ];

    for (const meta of metadataToUpsert) {
        await prisma.ragDocumentMetadata.upsert({
            where: { id: meta.id }, // Use provided ID for where clause
            update: { ...meta, projectId: undefined }, // Update all fields except projectId and id
            create: meta, // Create with all fields
        });
    }
    console.log('Upserted RAG Document Metadata entries.');

    // --- Upsert RAG Assets (using the common prompt as parent) ---
    const ragInstructionsName = 'RAG System General Instructions';
    const assetRagInstructions = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: ragCommonAssetsPrompt.id,
                projectId: ragProjectId,
                key: 'rag-instructions'
            }
        },
        update: {},
        create: {
            key: 'rag-instructions',
            promptId: ragCommonAssetsPrompt.id,
            projectId: ragProjectId
        }
    });
    const assetRagInstructionsV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetRagInstructions.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.',
            status: 'active',
            changeMessage: ragInstructionsName
        },
        create: {
            assetId: assetRagInstructions.id,
            value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: ragInstructionsName
        },
        select: { id: true }
    });

    const citationFormatAssetName = 'RAG Citation Format';
    const assetCitationFormat = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: ragCommonAssetsPrompt.id,
                projectId: ragProjectId,
                key: 'rag-citation-format'
            }
        },
        update: {},
        create: {
            key: 'rag-citation-format',
            promptId: ragCommonAssetsPrompt.id,
            projectId: ragProjectId
        }
    });
    const assetCitationFormatV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetCitationFormat.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Cite sources like this: (Source: [Document Name])',
            status: 'active',
            changeMessage: citationFormatAssetName
        },
        create: {
            assetId: assetCitationFormat.id,
            value: 'Cite sources like this: (Source: [Document Name])',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: citationFormatAssetName
        },
        select: { id: true }
    });

    const notFoundResponseAssetName = 'RAG Not Found Response';
    const assetNotFoundResponse = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: ragCommonAssetsPrompt.id,
                projectId: ragProjectId,
                key: 'rag-not-found-response'
            }
        },
        update: {},
        create: {
            key: 'rag-not-found-response',
            promptId: ragCommonAssetsPrompt.id,
            projectId: ragProjectId
        }
    });
    const assetNotFoundResponseV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetNotFoundResponse.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'I could not find information about that in the provided documents.',
            status: 'active',
            changeMessage: notFoundResponseAssetName
        },
        create: {
            assetId: assetNotFoundResponse.id,
            value: 'I could not find information about that in the provided documents.',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: notFoundResponseAssetName
        },
        select: { id: true }
    });
    console.log('Upserted RAG Assets and V1 Versions');

    const ragValidationRulesName = 'RAG Document Validation Rules';
    const assetRagValidationRules = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: ragCommonAssetsPrompt.id,
                projectId: ragProjectId,
                key: 'rag-validation-rules'
            }
        },
        update: {},
        create: {
            key: 'rag-validation-rules',
            promptId: ragCommonAssetsPrompt.id,
            projectId: ragProjectId
        }
    });
    const assetRagValidationRulesV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetRagValidationRules.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Validation rules: 1. Documents in supported format 2. Maximum size allowed 3. Non - malicious content 4. Complete metadata 5. Correctly generated embeddings',
            status: 'active',
            changeMessage: ragValidationRulesName
        },
        create: {
            assetId: assetRagValidationRules.id,
            value: 'Validation rules: 1. Documents in supported format 2. Maximum size allowed 3. Non - malicious content 4. Complete metadata 5. Correctly generated embeddings',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: ragValidationRulesName
        },
        select: { id: true }
    });

    const ragErrorMessagesName = 'RAG System Error Messages';
    const assetRagErrorMessages = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: ragCommonAssetsPrompt.id,
                projectId: ragProjectId,
                key: 'rag-error-messages'
            }
        },
        update: {},
        create: {
            key: 'rag-error-messages',
            promptId: ragCommonAssetsPrompt.id,
            projectId: ragProjectId
        }
    });
    const assetRagErrorMessagesV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetRagErrorMessages.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Error messages:
- "Unsupported format"
- "Size exceeds limit"
- "Malicious content detected"
- "Incomplete metadata"
- "Embedding generation error"`,
            status: 'active',
            changeMessage: ragErrorMessagesName
        },
        create: {
            assetId: assetRagErrorMessages.id,
            value: `Error messages:
- "Unsupported format"
- "Size exceeds limit"
- "Malicious content detected"
- "Incomplete metadata"
- "Embedding generation error"`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: ragErrorMessagesName
        },
        select: { id: true }
    });

    // --- Upsert RAG Prompt: Answer Question ---
    const promptRagQueryName = 'answer-hr-question-rag';
    const promptRagQuerySlug = slugify(promptRagQueryName); // ID
    const promptRagQuery = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: { // Usar nombre correcto
                id: promptRagQuerySlug,
                projectId: ragProjectId
            }
        },
        update: {
            name: promptRagQueryName,
            description: 'Core RAG prompt to answer user questions based on retrieved context.',
            tags: { set: getRagTagIds(['rag', 'hr-policy', 'employee-faq']) }
        },
        create: {
            id: promptRagQuerySlug, // ID es slug
            name: promptRagQueryName,
            description: 'Core RAG prompt to answer user questions based on retrieved context.',
            projectId: ragProjectId,
            tags: { connect: getRagTagIds(['rag', 'hr-policy', 'employee-faq']) }
        },
        select: { id: true, name: true }
    });

    // This prompt takes the user's question and the retrieved context as input at runtime.
    const promptRagQueryV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptRagQuery.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `{{rag-system-instruction}}\n\n            Context Documents:\n            --- START CONTEXT ---\n            {{Retrieved Context Chunks}}\n            --- END CONTEXT ---\n\n            User Question: {{User Question}}\n\n            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.\n
            Answer:`,
            status: 'active',
            activeInEnvironments: { set: [{ id: ragProdEnv.id }, { id: ragStagingEnv.id }] },
            aiModelId: ragGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptRagQuery.id, // Use ID
            promptText: `{{rag-system-instruction}}\n\n            Context Documents:\n            --- START CONTEXT ---\n            {{Retrieved Context Chunks}}\n            --- END CONTEXT ---\n\n            User Question: {{User Question}}\n\n            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.\n
            Answer:`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: 'Initial RAG prompt using system instructions and context.',
            activeInEnvironments: { connect: [{ id: ragProdEnv.id }, { id: ragStagingEnv.id }] },
            aiModelId: ragGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptRagQuery.name} V1`);

    // Crear traducciones es-ES para los assets y prompts
    await createSpanishTranslations(ragProjectId);

    console.log(`RAG & Document Q&A seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });