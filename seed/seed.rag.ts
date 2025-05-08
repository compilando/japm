import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Find necessary base data
    const defaultProjectId = 'default-project'; // Assuming the default project ID
    const stagingEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'staging', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });
    const productionEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'production', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });

    // --- RAG Project ---
    const ragProject = await prisma.project.upsert({
        where: { id: 'internal-hr-assistant' },
        update: { name: 'Internal HR Policy Assistant', description: 'AI assistant to answer employee questions based on HR documents.', ownerUserId: testUser.id },
        create: {
            id: 'internal-hr-assistant',
            name: 'Internal HR Policy Assistant',
            description: 'AI assistant to answer employee questions based on HR documents.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Upserted Project: ${ragProject.name}`);

    // Create specific AI models for this project
    const ragProjectId = ragProject.id;
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

    // --- Upsert RAG Assets ---
    const assetSystemInstruction = await prisma.promptAsset.upsert({
        where: {
            projectId_key: {
                projectId: ragProjectId,
                key: 'rag-system-instruction'
            }
        },
        update: { name: 'RAG System Instruction', type: 'Instruction' },
        create: { key: 'rag-system-instruction', name: 'RAG System Instruction', type: 'Instruction', projectId: ragProjectId }
    });
    const assetSystemInstructionV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetSystemInstruction.id,
                versionTag: 'v1.0.0'
            }
        },
        update: { value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.', status: 'active' },
        create: {
            assetId: assetSystemInstruction.id,
            value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.',
            versionTag: 'v1.0.0',
            status: 'active'
        },
        select: { id: true }
    });

    const assetCitationFormat = await prisma.promptAsset.upsert({
        where: {
            projectId_key: {
                projectId: ragProjectId,
                key: 'rag-citation-format'
            }
        },
        update: { name: 'RAG Citation Format', type: 'Instruction' },
        create: { key: 'rag-citation-format', name: 'RAG Citation Format', type: 'Instruction', projectId: ragProjectId }
    });
    const assetCitationFormatV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetCitationFormat.id,
                versionTag: 'v1.0.0'
            }
        },
        update: { value: 'Cite sources like this: (Source: [Document Name])', status: 'active' },
        create: {
            assetId: assetCitationFormat.id,
            value: 'Cite sources like this: (Source: [Document Name])',
            versionTag: 'v1.0.0',
            status: 'active'
        },
        select: { id: true }
    });

    const assetNotFoundResponse = await prisma.promptAsset.upsert({
        where: {
            projectId_key: {
                projectId: ragProjectId,
                key: 'rag-not-found-response'
            }
        },
        update: { name: 'RAG Not Found Response', type: 'Instruction' },
        create: { key: 'rag-not-found-response', name: 'RAG Not Found Response', type: 'Instruction', projectId: ragProjectId }
    });
    const assetNotFoundResponseV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetNotFoundResponse.id,
                versionTag: 'v1.0.0'
            }
        },
        update: { value: 'I could not find information about that in the provided documents.', status: 'active' },
        create: {
            assetId: assetNotFoundResponse.id,
            value: 'I could not find information about that in the provided documents.',
            versionTag: 'v1.0.0',
            status: 'active'
        },
        select: { id: true }
    });
    console.log('Upserted RAG Assets and V1 Versions');


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
            promptText: `{{rag-system-instruction}}\n\n            Context Documents:\n            --- START CONTEXT ---\n            {{Retrieved Context Chunks}}\n            --- END CONTEXT ---\n\n            User Question: {{User Question}}\n\n            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.\n\n            Answer:`,
            status: 'active',
            activeInEnvironments: { set: [{ id: productionEnvironment.id }, { id: stagingEnvironment.id }] },
            aiModelId: ragGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptRagQuery.id, // Use ID
            promptText: `{{rag-system-instruction}}\n\n            Context Documents:\n            --- START CONTEXT ---\n            {{Retrieved Context Chunks}}\n            --- END CONTEXT ---\n\n            User Question: {{User Question}}\n\n            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.\n\n            Answer:`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: 'Initial RAG prompt using system instructions and context.',
            activeInEnvironments: { connect: [{ id: productionEnvironment.id }, { id: stagingEnvironment.id }] },
            aiModelId: ragGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptRagQuery.name} V1`);

    console.log(`Internal Knowledge Base (RAG) seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });