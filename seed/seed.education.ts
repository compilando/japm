import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
        where: { id: 'biology-101-courseware' },
        update: { name: 'Biology 101 AI Tutor & Content Generator', description: 'Tools for creating quizzes and explanations for introductory biology.', ownerUserId: testUser.id },
        create: {
            id: 'biology-101-courseware',
            name: 'Biology 101 AI Tutor & Content Generator',
            description: 'Tools for creating quizzes and explanations for introductory biology.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Upserted Project: ${educationProject.name}`);

    // Upsert Educational Tags with prefix
    const eduProjectId = educationProject.id;
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
    const assetDefinitionCell = await prisma.promptAsset.upsert({
        where: { key: 'definition-cell-biology' },
        update: { name: 'Definition - Cell (Biology)', type: 'Definition', projectId: eduProjectId },
        create: { key: 'definition-cell-biology', name: 'Definition - Cell (Biology)', type: 'Definition', projectId: eduProjectId }
    });
    const assetDefinitionCellV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetDefinitionCell.key, versionTag: 'v1.0.0' } },
        update: { value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.', status: 'active' },
        create: { assetId: assetDefinitionCell.key, value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });

    const assetMcqTemplate = await prisma.promptAsset.upsert({
        where: { key: 'mcq-template-4-options' },
        update: { name: 'Multiple Choice Question Template (4 Options)', type: 'Template', projectId: eduProjectId },
        create: { key: 'mcq-template-4-options', name: 'Multiple Choice Question Template (4 Options)', type: 'Template', projectId: eduProjectId }
    });
    const assetMcqTemplateV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetMcqTemplate.key, versionTag: 'v1.0.0' } },
        update: { value: 'Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}', status: 'active' },
        create: { assetId: assetMcqTemplate.key, value: 'Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });

    const assetExplanationStyle = await prisma.promptAsset.upsert({
        where: { key: 'explanation-style-analogy' },
        update: { name: 'Explanation Style - Use Analogies', type: 'Instruction', projectId: eduProjectId },
        create: { key: 'explanation-style-analogy', name: 'Explanation Style - Use Analogies', type: 'Instruction', projectId: eduProjectId }
    });
    const assetExplanationStyleV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetExplanationStyle.key, versionTag: 'v1.0.0' } },
        update: { value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.', status: 'active' },
        create: { assetId: assetExplanationStyle.key, value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });
    console.log('Upserted Educational Assets and V1 Versions');

    // --- Upsert Educational Prompt: Explain Concept ---
    const promptExplainName = 'explain-biology-concept';
    const promptExplain = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: eduProjectId, name: promptExplainName } },
        update: {
            description: 'Explain a biological concept using a specific style.',
            tags: { set: getEduTagIds(['education', 'biology', 'explanation', 'tutoring']) }
        },
        create: {
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
            promptText: `Explain the following biological concept: {{Concept Name}}.
            Use this definition as a starting point if relevant: {{definition-cell-biology}} (Modify based on actual concept).
            Target Audience: High School Student.
            Required Style: {{explanation-style-analogy}}
            Keep the explanation under 150 words.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: stagingEnvironment.id }] }
        },
        create: {
            promptId: promptExplain.id, // Use ID
            promptText: `Explain the following biological concept: {{Concept Name}}.
            Use this definition as a starting point if relevant: {{definition-cell-biology}} (Modify based on actual concept).
            Target Audience: High School Student.
            Required Style: {{explanation-style-analogy}}
            Keep the explanation under 150 words.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for explaining concepts with analogies.',
            activeInEnvironments: { connect: [{ id: stagingEnvironment.id }] }
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptExplain.name} V1`);

    // Upsert Links individually
    const explainLinksToUpsert = [
        { assetVersionId: assetDefinitionCellV1.id, usageContext: 'Optional starting definition (example)', isRequired: false },
        { assetVersionId: assetExplanationStyleV1.id, usageContext: 'Instruction for explanation style' },
    ];
    for (const link of explainLinksToUpsert) {
        await prisma.promptAssetLink.upsert({
            where: { promptVersionId_assetVersionId: { promptVersionId: promptExplainV1.id, assetVersionId: link.assetVersionId } },
            update: { usageContext: link.usageContext, isRequired: link.isRequired },
            create: { promptVersionId: promptExplainV1.id, assetVersionId: link.assetVersionId, usageContext: link.usageContext, isRequired: link.isRequired },
        });
    }
    console.log(`Upserted links for ${promptExplain.name} V1`);

    // --- Upsert Educational Prompt: Generate Quiz Question ---
    const promptQuizName = 'generate-biology-mcq';
    const promptQuiz = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: eduProjectId, name: promptQuizName } },
        update: {
            description: 'Generate a multiple-choice question about a biology topic.',
            tags: { set: getEduTagIds(['education', 'biology', 'quiz', 'assessment']) }
        },
        create: {
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
            promptText: `Generate a multiple-choice question (MCQ) suitable for a high school biology student on the topic of: {{Topic}}.
            The question should test understanding, not just recall.
            Provide 4 plausible options (A, B, C, D), with only one correct answer.
            Format the output EXACTLY like this template:
            {{mcq-template-4-options}}
            Ensure the explanation clearly states why the correct answer is right and the others are wrong.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: stagingEnvironment.id }, { id: testingEnvironment.id }] }
        },
        create: {
            promptId: promptQuiz.id, // Use ID
            promptText: `Generate a multiple-choice question (MCQ) suitable for a high school biology student on the topic of: {{Topic}}.
            The question should test understanding, not just recall.
            Provide 4 plausible options (A, B, C, D), with only one correct answer.
            Format the output EXACTLY like this template:
            {{mcq-template-4-options}}
            Ensure the explanation clearly states why the correct answer is right and the others are wrong.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating MCQs.',
            activeInEnvironments: { connect: [{ id: stagingEnvironment.id }, { id: testingEnvironment.id }] }
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptQuiz.name} V1`);

    // Upsert Link
    await prisma.promptAssetLink.upsert({
        where: { promptVersionId_assetVersionId: { promptVersionId: promptQuizV1.id, assetVersionId: assetMcqTemplateV1.id } },
        update: { usageContext: 'MCQ output format template' },
        create: { promptVersionId: promptQuizV1.id, assetVersionId: assetMcqTemplateV1.id, usageContext: 'MCQ output format template' }
    });
    console.log(`Upserted links for ${promptQuiz.name} V1`);

    console.log(`Educational Content & Tutoring seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });