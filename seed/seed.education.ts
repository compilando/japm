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

    const testUser = await prisma.user.upsert({ /* ... */ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Assume Models, Environments created

    const educationProject = await prisma.project.upsert({
        where: { id: 'biology-101-courseware' },
        update: { name: 'Biology 101 AI Tutor & Content Generator', description: 'Tools for creating quizzes and explanations for introductory biology.' },
        create: {
            id: 'biology-101-courseware',
            name: 'Biology 101 AI Tutor & Content Generator',
            description: 'Tools for creating quizzes and explanations for introductory biology.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Created Project: ${educationProject.name}`);

    const educationTags = ['education', 'biology', 'quiz', 'explanation', 'tutoring', 'high-school', 'assessment'];
    for (const tagName of educationTags) {
        await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
        console.log(`Upserted Tag: ${tagName}`);
    }

    // --- Educational Assets ---
    const assetDefinitionCell = await prisma.promptAsset.create({ data: { key: 'definition-cell-biology', name: 'Definition - Cell (Biology)', type: 'Definition', project: { connect: { id: educationProject.id } } } });
    const assetDefinitionCellV1 = await prisma.promptAssetVersion.create({ data: { asset: { connect: { key: assetDefinitionCell.key } }, value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.', versionTag: 'v1.0.0', status: 'active' } });

    const assetMcqTemplate = await prisma.promptAsset.create({ data: { key: 'mcq-template-4-options', name: 'Multiple Choice Question Template (4 Options)', type: 'Template', project: { connect: { id: educationProject.id } } } });
    const assetMcqTemplateV1 = await prisma.promptAssetVersion.create({ data: { asset: { connect: { key: assetMcqTemplate.key } }, value: 'Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}', versionTag: 'v1.0.0', status: 'active' } });

    const assetExplanationStyle = await prisma.promptAsset.create({ data: { key: 'explanation-style-analogy', name: 'Explanation Style - Use Analogies', type: 'Instruction', project: { connect: { id: educationProject.id } } } });
    const assetExplanationStyleV1 = await prisma.promptAssetVersion.create({ data: { asset: { connect: { key: assetExplanationStyle.key } }, value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.', versionTag: 'v1.0.0', status: 'active' } });
    console.log('Created Educational Assets and V1 Versions');


    // --- Educational Prompt: Explain Concept ---
    const promptExplain = await prisma.prompt.create({
        data: {
            name: 'explain-biology-concept',
            description: 'Explain a biological concept using a specific style.',
            project: { connect: { id: educationProject.id } },
            tags: { connect: [{ name: 'education' }, { name: 'biology' }, { name: 'explanation' }, { name: 'tutoring' }] }
        }
    });

    const promptExplainV1 = await prisma.promptVersion.create({
        data: {
            prompt: { connect: { name: promptExplain.name } },
            promptText: `Explain the following biological concept: {{Concept Name}}.
            Use this definition as a starting point if relevant: {{definition-cell-biology}} (Modify based on actual concept).
            Target Audience: High School Student.
            Required Style: {{explanation-style-analogy}}
            Keep the explanation under 150 words.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for explaining concepts with analogies.',
            activeInEnvironments: { connect: [{ name: 'staging' }] }
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
            project: { connect: { id: educationProject.id } },
            tags: { connect: [{ name: 'education' }, { name: 'biology' }, { name: 'quiz' }, { name: 'assessment' }] }
        }
    });

    const promptQuizV1 = await prisma.promptVersion.create({
        data: {
            prompt: { connect: { name: promptQuiz.name } },
            promptText: `Generate a multiple-choice question (MCQ) suitable for a high school biology student on the topic of: {{Topic}}.
            The question should test understanding, not just recall.
            Provide 4 plausible options (A, B, C, D), with only one correct answer.
            Format the output EXACTLY like this template:
            {{mcq-template-4-options}}
            Ensure the explanation clearly states why the correct answer is right and the others are wrong.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial prompt for generating MCQs.',
            activeInEnvironments: { connect: [{ name: 'staging' }, { name: 'testing' }] }
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