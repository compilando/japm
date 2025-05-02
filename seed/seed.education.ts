import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

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
        update: { name: 'Biology 101 AI Tutor & Content Generator', description: 'Tools for creating quizzes and explanations for introductory biology.', owner: { connect: { id: testUser.id } } },
        create: {
            id: 'biology-101-courseware',
            name: 'Biology 101 AI Tutor & Content Generator',
            description: 'Tools for creating quizzes and explanations for introductory biology.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Created Project: ${educationProject.name}`);

    // Add prefix to tags
    const eduProjectId = educationProject.id;
    const eduPrefix = 'edu_';
    const eduBaseTags = ['education', 'biology', 'quiz', 'explanation', 'tutoring', 'high-school', 'assessment'];
    const eduTagsToConnect: { name: string }[] = [];

    for (const baseTagName of eduBaseTags) {
        const tagName = `${eduPrefix}${baseTagName}`;
        const existingTag = await prisma.tag.findUnique({ where: { name: tagName } });

        if (existingTag) {
            if (existingTag.projectId !== eduProjectId) {
                await prisma.tag.update({ where: { id: existingTag.id }, data: { projectId: eduProjectId } });
                console.log(`Updated Tag: ${tagName} project link to ${eduProjectId}`);
            }
        } else {
            await prisma.tag.create({ data: { name: tagName, projectId: eduProjectId } });
            console.log(`Created Tag: ${tagName} for project ${eduProjectId}`);
        }
        eduTagsToConnect.push({ name: tagName });
    }

    // --- Educational Assets ---
    const assetDefinitionCell = await prisma.promptAsset.create({ data: { key: 'definition-cell-biology', name: 'Definition - Cell (Biology)', type: 'Definition', projectId: educationProject.id } });
    const assetDefinitionCellV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetDefinitionCell.key, value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.', versionTag: 'v1.0.0', status: 'active' } });

    const assetMcqTemplate = await prisma.promptAsset.create({ data: { key: 'mcq-template-4-options', name: 'Multiple Choice Question Template (4 Options)', type: 'Template', projectId: educationProject.id } });
    const assetMcqTemplateV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetMcqTemplate.key, value: 'Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}', versionTag: 'v1.0.0', status: 'active' } });

    const assetExplanationStyle = await prisma.promptAsset.create({ data: { key: 'explanation-style-analogy', name: 'Explanation Style - Use Analogies', type: 'Instruction', projectId: educationProject.id } });
    const assetExplanationStyleV1 = await prisma.promptAssetVersion.create({ data: { assetId: assetExplanationStyle.key, value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.', versionTag: 'v1.0.0', status: 'active' } });
    console.log('Created Educational Assets and V1 Versions');


    // --- Educational Prompt: Explain Concept ---
    const promptExplain = await prisma.prompt.create({
        data: {
            name: 'explain-biology-concept',
            description: 'Explain a biological concept using a specific style.',
            projectId: educationProject.id,
            tags: { connect: eduTagsToConnect.filter(t => ['edu_education', 'edu_biology', 'edu_explanation', 'edu_tutoring'].includes(t.name)) } // Connect prefixed tags
        }
    });

    const promptExplainV1 = await prisma.promptVersion.create({
        data: {
            promptId: promptExplain.name,
            promptText: `Explain the following biological concept: {{Concept Name}}.
            Use this definition as a starting point if relevant: {{definition-cell-biology}} (Modify based on actual concept).
            Target Audience: High School Student.
            Required Style: {{explanation-style-analogy}}
            Keep the explanation under 150 words.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for explaining concepts with analogies.',
            activeInEnvironments: { connect: [{ id: stagingEnvironment.id }] }
        }
    });
    console.log(`Created Prompt ${promptExplain.name} V1`);

    await prisma.promptAssetLink.createMany({
        data: [
            // Concept Name is dynamic input
            { promptVersionId: promptExplainV1.id, assetVersionId: assetDefinitionCellV1.id, usageContext: 'Optional starting definition (example)', isRequired: false }, // Make optional
            { promptVersionId: promptExplainV1.id, assetVersionId: assetExplanationStyleV1.id, usageContext: 'Instruction for explanation style' },
        ]
    });
    console.log(`Linked assets to ${promptExplain.name} V1`);

    // --- Educational Prompt: Generate Quiz Question ---
    const promptQuiz = await prisma.prompt.create({
        data: {
            name: 'generate-biology-mcq',
            description: 'Generate a multiple-choice question about a biology topic.',
            projectId: educationProject.id,
            tags: { connect: eduTagsToConnect.filter(t => ['edu_education', 'edu_biology', 'edu_quiz', 'edu_assessment'].includes(t.name)) } // Connect prefixed tags
        }
    });

    const promptQuizV1 = await prisma.promptVersion.create({
        data: {
            promptId: promptQuiz.name,
            promptText: `Generate a multiple-choice question (MCQ) suitable for a high school biology student on the topic of: {{Topic}}.
            The question should test understanding, not just recall.
            Provide 4 plausible options (A, B, C, D), with only one correct answer.
            Format the output EXACTLY like this template:
            {{mcq-template-4-options}}
            Ensure the explanation clearly states why the correct answer is right and the others are wrong.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating MCQs.',
            activeInEnvironments: { connect: [{ id: stagingEnvironment.id }, { id: testingEnvironment.id }] }
        }
    });
    console.log(`Created Prompt ${promptQuiz.name} V1`);

    await prisma.promptAssetLink.create({
        data: { promptVersionId: promptQuizV1.id, assetVersionId: assetMcqTemplateV1.id, usageContext: 'MCQ output format template' }
    });
    console.log(`Linked assets to ${promptQuiz.name} V1`);

    console.log(`Educational Content & Tutoring seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });