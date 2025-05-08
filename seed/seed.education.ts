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
    console.log(`Start seeding for Educational Content & Tutoring...`);
    console.log('Assuming prior cleanup...');

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Find necessary base data
    const defaultProjectId = 'default-project'; // Assuming the default project ID
    const stagingEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'staging', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });
    const testingEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'testing', projectId: defaultProjectId } }, // Find env in default project
        select: { id: true } // Select ID for connecting later
    });

    const educationProject = await prisma.project.upsert({
        where: { id: 'biology-101-project' },
        update: { name: 'Biology 101 AI Tutor & Content Generator', description: 'AI-powered biology tutoring and content generation.', ownerUserId: testUser.id },
        create: {
            id: 'biology-101-project',
            name: 'Biology 101 AI Tutor & Content Generator',
            description: 'AI-powered biology tutoring and content generation.',
            owner: { connect: { id: testUser.id } }
        },
    });
    console.log(`Upserted Project: ${educationProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto Education
    await createSpanishRegionAndCulturalData(educationProject.id);
    // Crear región en-US y datos culturales para el proyecto Education
    await createUSRegionAndCulturalData(educationProject.id);

    // Create specific AI models for this project
    const eduProjectId = educationProject.id;
    const eduGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: eduProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: eduProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const eduGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: eduProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: eduProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${eduProjectId}`);

    // Upsert Educational Tags with prefix
    const eduPrefix = 'edu_';
    const eduBaseTags = ['education', 'biology', 'quiz', 'explanation', 'tutoring', 'high-school', 'assessment'];
    const eduTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of eduBaseTags) {
        const tagName = `${eduPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: eduProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: eduProjectId },
            select: { id: true }
        });
        eduTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${eduProjectId}`);
    }
    // Helper function to get tag IDs
    const getEduTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => eduTagMap.get(`${eduPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // --- Upsert Educational Assets ---
    const definitionCellAssetName = 'Definition - Cell (Biology)';
    const assetDefinitionCell = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: eduProjectId,
                key: 'definition-cell-biology'
            }
        },
        update: {},
        create: {
            key: 'definition-cell-biology',
            projectId: eduProjectId
        }
    });
    const assetDefinitionCellV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetDefinitionCell.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.',
            status: 'active',
            changeMessage: definitionCellAssetName
        },
        create: {
            assetId: assetDefinitionCell.id,
            value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: definitionCellAssetName
        },
        select: { id: true }
    });

    const mcqTemplateAssetName = 'Multiple Choice Question Template (4 Options)';
    const assetMcqTemplate = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: eduProjectId,
                key: 'mcq-template-4-options'
            }
        },
        update: {},
        create: {
            key: 'mcq-template-4-options',
            projectId: eduProjectId
        }
    });
    const assetMcqTemplateV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetMcqTemplate.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}',
            status: 'active',
            changeMessage: mcqTemplateAssetName
        },
        create: {
            assetId: assetMcqTemplate.id,
            value: 'Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: mcqTemplateAssetName
        },
        select: { id: true }
    });

    const explanationStyleAssetName = 'Explanation Style - Use Analogies';
    const assetExplanationStyle = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: eduProjectId,
                key: 'explanation-style-analogy'
            }
        },
        update: {},
        create: {
            key: 'explanation-style-analogy',
            projectId: eduProjectId
        }
    });
    const assetExplanationStyleV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetExplanationStyle.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.',
            status: 'active',
            changeMessage: explanationStyleAssetName
        },
        create: {
            assetId: assetExplanationStyle.id,
            value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: explanationStyleAssetName
        },
        select: { id: true }
    });
    console.log('Upserted Educational Assets and V1 Versions');

    // --- Upsert Educational Prompt: Explain Concept ---
    const promptExplainName = 'explain-biology-concept';
    const promptExplainSlug = slugify(promptExplainName);
    const promptExplain = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: promptExplainSlug,
                projectId: eduProjectId
            }
        },
        update: {
            name: promptExplainName,
            description: 'Explain a biological concept using a specific style.',
            tags: { set: getEduTagIds(['education', 'biology', 'explanation', 'tutoring']) }
        },
        create: {
            id: promptExplainSlug,
            name: promptExplainName,
            description: 'Explain a biological concept using a specific style.',
            projectId: eduProjectId,
            tags: { connect: getEduTagIds(['education', 'biology', 'explanation', 'tutoring']) }
        },
        select: { id: true, name: true }
    });

    const promptExplainV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptExplain.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Explain the following biological concept: {{Concept Name}}.\n            Use this definition as a starting point if relevant: {{definition-cell-biology}} (Modify based on actual concept).\n            Target Audience: High School Student.\n            Required Style: {{explanation-style-analogy}}\n            Keep the explanation under 150 words.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: stagingEnvironment.id }] },
            aiModelId: eduGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptExplain.id, // Use ID
            promptText: `Explain the following biological concept: {{Concept Name}}.\n            Use this definition as a starting point if relevant: {{definition-cell-biology}} (Modify based on actual concept).\n            Target Audience: High School Student.\n            Required Style: {{explanation-style-analogy}}\n            Keep the explanation under 150 words.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for explaining concepts with analogies.',
            activeInEnvironments: { connect: [{ id: stagingEnvironment.id }] },
            aiModelId: eduGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptExplain.name} V1`);

    // --- Upsert Educational Prompt: Generate Quiz Question ---
    const promptQuizName = 'generate-biology-mcq';
    const promptQuizSlug = slugify(promptQuizName);
    const promptQuiz = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: promptQuizSlug,
                projectId: eduProjectId
            }
        },
        update: {
            name: promptQuizName,
            description: 'Generate a multiple-choice question about a biology topic.',
            tags: { set: getEduTagIds(['education', 'biology', 'quiz', 'assessment']) }
        },
        create: {
            id: promptQuizSlug,
            name: promptQuizName,
            description: 'Generate a multiple-choice question about a biology topic.',
            projectId: eduProjectId,
            tags: { connect: getEduTagIds(['education', 'biology', 'quiz', 'assessment']) }
        },
        select: { id: true, name: true }
    });

    const promptQuizV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptQuiz.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate a multiple-choice question (MCQ) suitable for a high school biology student on the topic of: {{Topic}}.\n            The question should test understanding, not just recall.\n            Provide 4 plausible options (A, B, C, D), with only one correct answer.\n            Format the output EXACTLY like this template:\n            {{mcq-template-4-options}}\n            Ensure the explanation clearly states why the correct answer is right and the others are wrong.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: stagingEnvironment.id }, { id: testingEnvironment.id }] },
            aiModelId: eduGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptQuiz.id, // Use ID
            promptText: `Generate a multiple-choice question (MCQ) suitable for a high school biology student on the topic of: {{Topic}}.\n            The question should test understanding, not just recall.\n            Provide 4 plausible options (A, B, C, D), with only one correct answer.\n            Format the output EXACTLY like this template:\n            {{mcq-template-4-options}}\n            Ensure the explanation clearly states why the correct answer is right and the others are wrong.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating MCQs.',
            activeInEnvironments: { connect: [{ id: stagingEnvironment.id }, { id: testingEnvironment.id }] },
            aiModelId: eduGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptQuiz.name} V1`);

    console.log(`Educational Content & Tutoring seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });