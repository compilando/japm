import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

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
        update: { name: 'Internal HR Policy Assistant', description: 'AI assistant to answer employee questions based on HR documents.', owner: { connect: { id: testUser.id } } },
        create: {
            id: 'internal-hr-assistant',
            name: 'Internal HR Policy Assistant',
            description: 'AI assistant to answer employee questions based on HR documents.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Created Project: ${ragProject.name}`);

    // --- RAG Tags with prefix ---
    const ragProjectId = ragProject.id;
    const ragPrefix = 'rag_';
    const ragBaseTags = ['rag', 'internal-kb', 'hr-policy', 'employee-faq', 'compliance'];
    const ragTagsToConnect: { name: string }[] = [];

    for (const baseTagName of ragBaseTags) {
        const tagName = `${ragPrefix}${baseTagName}`;
        const existingTag = await prisma.tag.findUnique({ where: { name: tagName } });

        if (existingTag) {
            if (existingTag.projectId !== ragProjectId) {
                await prisma.tag.update({ where: { id: existingTag.id }, data: { projectId: ragProjectId } });
                console.log(`Updated Tag: ${tagName} project link to ${ragProjectId}`);
            }
        } else {
            await prisma.tag.create({ data: { name: tagName, projectId: ragProjectId } });
            console.log(`Created Tag: ${tagName} for project ${ragProjectId}`);
        }
        ragTagsToConnect.push({ name: tagName });
    }

    // --- RAG Document Metadata ---
    // NOTE: These link conceptually to the documents used for retrieval.
    // The schema doesn't store the doc content or vectors, just metadata.
    await prisma.ragDocumentMetadata.createMany({
        data: [
            { documentName: 'Employee Handbook v4.2', category: 'HR Policy', complianceReviewed: true, piiRiskLevel: 'Medium', lastReviewedBy: 'HR Compliance Team', id: 'doc-handbook-v4-2', projectId: ragProject.id },
            { documentName: 'Remote Work Policy 2024', category: 'HR Policy', complianceReviewed: true, piiRiskLevel: 'Low', lastReviewedBy: 'HR Compliance Team', id: 'doc-remote-policy-2024', projectId: ragProject.id },
            { documentName: 'Benefits Guide 2025', category: 'Benefits', complianceReviewed: true, piiRiskLevel: 'High', lastReviewedBy: 'Benefits Team', id: 'doc-benefits-2025', projectId: ragProject.id },
            { documentName: 'IT Security Guidelines', category: 'IT Policy', complianceReviewed: false, piiRiskLevel: 'Low', lastReviewedBy: 'IT Security', id: 'doc-it-sec-guide', projectId: ragProject.id }, // Example not reviewed
        ],
    });
    console.log('Created RAG Document Metadata entries.');

    // --- RAG Assets ---
    const assetSystemInstruction = await prisma.promptAsset.create({ data: { key: 'rag-system-instruction', name: 'RAG System Instruction', type: 'Instruction', projectId: ragProject.id } });
    const assetSystemInstructionV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetSystemInstruction.key, value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.', versionTag: 'v1.0.0', status: 'active' } });

    const assetCitationFormat = await prisma.promptAsset.create({ data: { key: 'rag-citation-format', name: 'RAG Citation Format', type: 'Instruction', projectId: ragProject.id } });
    const assetCitationFormatV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetCitationFormat.key, value: 'Cite sources like this: (Source: [Document Name])', versionTag: 'v1.0.0', status: 'active' } });

    const assetNotFoundResponse = await prisma.promptAsset.create({ data: { key: 'rag-not-found-response', name: 'RAG Not Found Response', type: 'Instruction', projectId: ragProject.id } });
    const assetNotFoundResponseV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetNotFoundResponse.key, value: 'I could not find information about that in the provided documents.', versionTag: 'v1.0.0', status: 'active' } });
    console.log('Created RAG Assets and V1 Versions');


    // --- RAG Prompt: Answer Question ---
    const promptRagQuery = await prisma.prompt.create({
        data: {
            name: 'answer-hr-question-rag',
            description: 'Core RAG prompt to answer user questions based on retrieved context.',
            projectId: ragProject.id,
            tags: { connect: ragTagsToConnect.filter(t => ['rag_rag', 'rag_hr-policy', 'rag_employee-faq'].includes(t.name)) } // Connect prefixed tags
        }
    });

    // This prompt takes the user's question and the retrieved context as input at runtime.
    const promptRagQueryV1 = await prisma.promptVersion.create({
        data: {
            promptId: promptRagQuery.name,
            promptText: `{{rag-system-instruction}}\n\n            Context Documents:\n            --- START CONTEXT ---
            {{Retrieved Context Chunks}}\n            --- END CONTEXT ---

            User Question: {{User Question}}\n
            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.\n
            Answer:`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: 'Initial RAG prompt using system instructions and context.',
            activeInEnvironments: { connect: [{ id: productionEnvironment.id }, { id: stagingEnvironment.id }] } // Use env IDs
        }
    });
    console.log(`Created Prompt ${promptRagQuery.name} V1`);

    await prisma.promptAssetLink.createMany({
        data: [
            { promptVersionId: promptRagQueryV1.id, assetVersionId: assetSystemInstructionV1.id, usageContext: 'Overall system behavior instruction', position: 1 },
            { promptVersionId: promptRagQueryV1.id, assetVersionId: assetCitationFormatV1.id, usageContext: 'Instruction on how to cite sources', position: 2 },
            { promptVersionId: promptRagQueryV1.id, assetVersionId: assetNotFoundResponseV1.id, usageContext: 'Standard response when info is missing', position: 3 },
            // Note: Retrieved Context Chunks and User Question are dynamic inputs, not static assets.
        ]
    });
    console.log(`Linked assets to ${promptRagQuery.name} V1`);

    console.log(`Internal Knowledge Base (RAG) seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });