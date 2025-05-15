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

// Traducciones específicas para el proyecto de educación
const educationTranslations = {
    assets: {
        'definition-cell-biology': 'La unidad estructural, funcional y biológica básica de todos los organismos conocidos. Una célula es la unidad más pequeña de vida.',
        'mcq-template-4-options': `Question:\n{Question Text}\nA) {Option A}\nB) {Option B}\nC) {Option C}\nD) {Option D}\nCorrect Answer: {Correct Letter}\nExplanation: {Explanation Text}`,
        'explanation-style-analogy': 'Explica el concepto de manera clara y concisa. Usa un lenguaje simple adecuado para un estudiante de secundaria. Cuando sea posible, incluye una analogía simple para facilitar la comprensión.'
    },
    prompts: {
        'generate-biology-quiz': `Generate a biology quiz with the following characteristics:\n\nTopic: {topic}\nLevel: {level}\nNumber of questions: {number}\n\nInclude:\n- Multiple choice questions\n- One short answer question\n- One analysis question\n\nEnsure questions are clear and challenging.`,
        'explain-biology-concept': `Explain the following biology concept:\n\nConcept: {concept}\nLevel: {level}\n\nThe explanation should include:\n- Clear definition\n- Relevant examples\n- Simple analogies\n- Practical applications\n\nUse language accessible to high school students.`,
        'create-study-guide': `Create a study guide for the following biology topic:\n\nTopic: {topic}\nLevel: {level}\n\nThe guide should include:\n- Topic summary\n- Key points\n- Diagrams or visualizations\n- Practice exercises\n- Additional resources\n\nOrganize the information in a clear and structured way.`
    }
};

// Corregida la función createSpanishTranslations
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const promptVersions = await prisma.promptVersion.findMany({
        where: { prompt: { projectId: projectId } },
        include: { prompt: { select: { id: true } } }
    });
    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: { asset: { prompt: { projectId: projectId } } },
        include: { asset: { select: { key: true } } }
    });
    for (const version of promptVersions) {
        const translationKey = version.prompt.id;
        const translationText = educationTranslations.prompts[translationKey] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
            update: { promptText: translationText },
            create: { versionId: version.id, languageCode: 'es-ES', promptText: translationText }
        });
        console.log(`Created Spanish translation for prompt version ${version.id} (slug: ${translationKey})`);
    }
    for (const version of promptAssetVersions) {
        if (version.asset && version.asset.key) {
            const translationText = educationTranslations.assets[version.asset.key] || version.value;
            await prisma.assetTranslation.upsert({
                where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
                update: { value: translationText },
                create: { versionId: version.id, languageCode: 'es-ES', value: translationText }
            });
            console.log(`Created Spanish translation for asset version ${version.id} (key: ${version.asset.key})`);
        } else {
            console.warn(`Skipping translation for asset version ${version.id} due to missing asset key.`);
        }
    }
    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Educational Content & Tutoring...`);

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }
    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });
    const defaultProjectId = 'default-project';
    const stagingEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { name: 'staging', projectId: defaultProjectId } },
        select: { id: true }
    });

    const educationProject = await prisma.project.upsert({
        where: { id: 'education-content-project' },
        update: { name: 'Education Content Generation', description: 'AI-powered educational content generation and management.', ownerUserId: testUser.id },
        create: {
            id: 'education-content-project',
            name: 'Education Content Generation',
            description: 'AI-powered educational content generation and management.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
        },
    });
    console.log(`Upserted Project: ${educationProject.name}`);
    await createSpanishRegionAndCulturalData(educationProject.id);
    await createUSRegionAndCulturalData(educationProject.id);
    const eduProjectId = educationProject.id;
    const eduGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: eduProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: eduProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${eduProjectId}`);
    const eduPrefix = 'edu_';
    const eduBaseTags = ['education', 'biology', 'quiz', 'explanation', 'tutoring', 'high-school', 'assessment'];
    const eduTagMap: Map<string, string> = new Map();
    for (const baseTagName of eduBaseTags) {
        const tagName = `${eduPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: eduProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: eduProjectId },
            select: { id: true }
        });
        eduTagMap.set(tagName, tag.id);
        console.log(`Upserted Tag: ${tagName} for project ${eduProjectId}`);
    }
    const getEduTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => eduTagMap.get(`${eduPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // ELIMINADO: Creación del Prompt "Education Common Assets" y sus assets

    const educationProjectPrompts: {
        id: string;
        name: string;
        description: string;
        promptText: string;
        tags: string[];
        assets?: { key: string; name: string; initialValue: string; initialChangeMessage?: string }[];
        aiModelId?: string;
        activeInEnvironments?: { id: string }[];
    }[] = [
            {
                id: slugify('generate-biology-quiz'),
                name: 'Generate Biology Quiz',
                description: 'Generates a biology quiz with multiple question types.',
                promptText: educationTranslations.prompts['generate-biology-quiz'] || 'Generate quiz on {topic}',
                tags: ['biology', 'quiz', 'assessment'],
                assets: [
                    {
                        key: 'mcq-template-4-options',
                        name: 'MCQ Template (4 Options)',
                        initialValue: educationTranslations.assets['mcq-template-4-options'] || 'Default MCQ template'
                    }
                ],
                aiModelId: eduGpt4o.id,
                activeInEnvironments: [{ id: stagingEnvironment.id }]
            },
            {
                id: slugify('explain-biology-concept'),
                name: 'Explain Biology Concept',
                description: 'Explains a biology concept clearly with analogies.',
                promptText: educationTranslations.prompts['explain-biology-concept'] || 'Explain: {concept}',
                tags: ['biology', 'explanation', 'tutoring'],
                assets: [
                    {
                        key: 'explanation-style-analogy',
                        name: 'Explanation Style: Use Analogies',
                        initialValue: educationTranslations.assets['explanation-style-analogy'] || 'Explain simply with analogies.'
                    },
                    {
                        key: 'definition-cell-biology',
                        name: 'Definition: Cell Biology',
                        initialValue: educationTranslations.assets['definition-cell-biology'] || 'A cell is the basic unit of life.'
                    }
                ],
                aiModelId: eduGpt4o.id,
                activeInEnvironments: [{ id: stagingEnvironment.id }]
            },
            {
                id: slugify('create-study-guide'),
                name: 'Create Biology Study Guide',
                description: 'Creates a structured study guide for a biology topic.',
                promptText: educationTranslations.prompts['create-study-guide'] || 'Create study guide for {topic}',
                tags: ['biology', 'education', 'tutoring'],
                aiModelId: eduGpt4o.id,
                activeInEnvironments: [{ id: stagingEnvironment.id }]
            }
        ];

    for (const promptData of educationProjectPrompts) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptData.id, projectId: eduProjectId } },
            update: {
                name: promptData.name,
                description: promptData.description,
                tags: { connect: getEduTagIds(promptData.tags) }
            },
            create: {
                id: promptData.id,
                name: promptData.name,
                description: promptData.description,
                project: { connect: { id: eduProjectId } },
                tags: { connect: getEduTagIds(promptData.tags) },
            },
        });
        console.log(`Upserted Prompt: ${prompt.name} (ID: ${prompt.id}) in project ${eduProjectId}`);

        if (promptData.assets) {
            for (const assetInfo of promptData.assets) {
                const asset = await prisma.promptAsset.upsert({
                    where: {
                        prompt_asset_key_unique: {
                            promptId: prompt.id,
                            projectId: eduProjectId,
                            key: assetInfo.key,
                        }
                    },
                    update: {},
                    create: {
                        key: assetInfo.key,
                        promptId: prompt.id,
                        projectId: eduProjectId,
                    },
                    include: { versions: true }
                });

                let version = asset.versions?.find(v => v.versionTag === 'v1.0.0');
                if (!version) {
                    version = await prisma.promptAssetVersion.create({
                        data: {
                            assetId: asset.id,
                            value: assetInfo.initialValue,
                            versionTag: 'v1.0.0',
                            status: 'active',
                            changeMessage: assetInfo.initialChangeMessage || `Initial version of ${assetInfo.name}`
                        }
                    });
                    console.log(`Created initial version for asset ${assetInfo.key} in prompt ${prompt.id}`);
                } else if (version.value !== assetInfo.initialValue) {
                    await prisma.promptAssetVersion.update({
                        where: { id: version.id },
                        data: { value: assetInfo.initialValue, changeMessage: `Updated initial value for ${assetInfo.name} during seed` }
                    });
                    console.log(`Updated initial version for asset ${assetInfo.key} in prompt ${prompt.id}`);
                }
            }
        }

        await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptData.promptText,
                status: 'active',
                changeMessage: `Initial version for ${promptData.name}. (Updated via upsert)`,
                activeInEnvironments: { set: promptData.activeInEnvironments || [{ id: stagingEnvironment.id }] },
                aiModelId: promptData.aiModelId || eduGpt4o.id
            },
            create: {
                promptId: prompt.id,
                promptText: promptData.promptText,
                versionTag: 'v1.0.0', status: 'active',
                changeMessage: `Initial version for ${promptData.name}.`,
                activeInEnvironments: { connect: promptData.activeInEnvironments || [{ id: stagingEnvironment.id }] },
                aiModelId: promptData.aiModelId || eduGpt4o.id
            },
        });
        console.log(`Upserted PromptVersion for ${prompt.name} V1`);
    }

    await createSpanishTranslations(eduProjectId);
    console.log(`Finished seeding Educational Content & Tutoring.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); }); 