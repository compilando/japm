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

// Estructuras para los seeds
interface PromptAssetSeed {
    key: string;
}

interface AssetVersionSeed {
    assetKey: string;
    versionTag: string;
    value: string;
    name?: string;
    type?: string;
    description?: string;
    category?: string;
}

interface PromptVersionSeed {
    versionTag: string;
    promptText?: string;
    aiModelId?: string;
    assetVersions?: AssetVersionSeed[];
}

interface EducationPromptSeed {
    promptSlug: string;
    promptName: string;
    promptDescription: string;
    promptContent: string;
    promptTags?: string[];
    assets: PromptAssetSeed[];
    versions: PromptVersionSeed[];
}

// Traducciones específicas para el proyecto de educación
const educationTranslations = {
    assets: {
        'definition-cell-biology': 'La unidad estructural, funcional y biológica básica de todos los organismos conocidos. Una célula es la unidad más pequeña de vida.',
        'mcq-template-4-options': `Question:
{Question Text}
A) {Option A}
B) {Option B}
C) {Option C}
D) {Option D}
Correct Answer: {Correct Letter}
Explanation: {Explanation Text}`,
        'explanation-style-analogy': 'Explica el concepto de manera clara y concisa. Usa un lenguaje simple adecuado para un estudiante de secundaria. Cuando sea posible, incluye una analogía simple para facilitar la comprensión.'
    },
    prompts: {
        'generate-biology-quiz': `Generate a biology quiz with the following characteristics:

Topic: {topic}
Level: {level}
Number of questions: {number}

Include:
- Multiple choice questions
- One short answer question
- One analysis question

Ensure questions are clear and challenging.`,
        'explain-biology-concept': `Explain the following biology concept:

Concept: {concept}
Level: {level}

The explanation should include:
- Clear definition
- Relevant examples
- Simple analogies
- Practical applications

Use language accessible to high school students.`,
        'create-study-guide': `Create a study guide for the following biology topic:

Topic: {topic}
Level: {level}

The guide should include:
- Topic summary
- Key points
- Diagrams or visualizations
- Practice exercises
- Additional resources

Organize the information in a clear and structured way.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);

    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId,
            }
        },
        include: {
            prompt: true
        }
    });

    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: {
            asset: {
                projectId: projectId,
            }
        },
        include: {
            asset: true
        }
    });

    // Crear traducciones para promptversion
    for (const version of promptVersions) {
        // Usar el slug del prompt como clave para la traducción
        const translation = educationTranslations.prompts[version.prompt.id] || version.promptText;
        if (translation) {
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
            console.log(`Created/Updated Spanish translation for prompt version ${version.id} (Prompt: ${version.prompt.id})`);
        } else {
            console.warn(`No Spanish translation found for prompt: ${version.prompt.id}`);
        }
    }

    // Crear traducciones para promptassetversion
    for (const version of promptAssetVersions) {
        // Usar la key del asset como clave para la traducción
        const translation = educationTranslations.assets[version.asset.key] || version.value as string;
        if (translation) {
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
            console.log(`Created/Updated Spanish translation for prompt asset version ${version.id} (Asset Key: ${version.asset.key})`);
        } else {
            console.warn(`No Spanish translation found for asset key: ${version.asset.key}`);
        }
    }

    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

// Datos para los prompts de Education
const educationPrompts: EducationPromptSeed[] = [
    {
        promptSlug: 'generate-biology-quiz',
        promptName: 'Generate Biology Quiz',
        promptDescription: 'Generates a biology quiz based on specified topic, level, and number of questions.',
        promptContent: `Generate a biology quiz with the following characteristics:\\n\\nTopic: {{topic}}\\nLevel: {{level}}\\nNumber of questions: {{number}}\\n\\nInclude:\\n- Multiple choice questions using the template: {{mcq_template_4_options}}\\n- One short answer question\\n- One analysis question\\n\\nEnsure questions are clear and challenging. Explain all answers.`,
        promptTags: ['biology', 'quiz', 'assessment', 'high-school'],
        assets: [
            { key: 'mcq-template-4-options' },
        ],
        versions: [
            {
                versionTag: 'v1.0.0',
                assetVersions: [
                    {
                        assetKey: 'mcq-template-4-options',
                        versionTag: 'v1.0.0',
                        name: 'MCQ Template (4 options)',
                        type: 'text',
                        description: 'Template for multiple-choice questions with four options.',
                        value: 'Question:\\n{Question Text}\\nA) {Option A}\\nB) {Option B}\\nC) {Option C}\\nD) {Option D}\\nCorrect Answer: {Correct Letter}\\nExplanation: {Explanation Text}'
                    }
                ]
            }
        ]
    },
    {
        promptSlug: 'explain-biology-concept',
        promptName: 'Explain Biology Concept',
        promptDescription: 'Explains a biology concept with definitions, examples, analogies, and applications.',
        promptContent: `Explain the following biology concept:\\n\\nConcept: {{concept}}\\nLevel: {{level}}\\n\\nThe explanation should include:\\n- Clear definition from: {{definition_cell_biology}}\\n- Relevant examples\\n- Simple analogies following style: {{explanation_style_analogy}}\\n- Practical applications\\n\\nUse language accessible to high school students.`,
        promptTags: ['biology', 'explanation', 'tutoring', 'high-school'],
        assets: [
            { key: 'definition-cell-biology' },
            { key: 'explanation-style-analogy' },
        ],
        versions: [
            {
                versionTag: 'v1.0.0',
                assetVersions: [
                    {
                        assetKey: 'definition-cell-biology',
                        versionTag: 'v1.0.0',
                        name: 'Definition - Cell Biology',
                        type: 'text',
                        description: 'Standard definition of a cell in biology.',
                        value: 'The basic structural, functional, and biological unit of all known organisms. A cell is the smallest unit of life.'
                    },
                    {
                        assetKey: 'explanation-style-analogy',
                        versionTag: 'v1.0.0',
                        name: 'Explanation Style with Analogy',
                        type: 'text',
                        description: 'Guideline for styling explanations with analogies.',
                        value: 'Explain the concept clearly and concisely. Use simple language suitable for a high school student. Where possible, include a simple analogy to aid understanding.'
                    }
                ]
            }
        ]
    },
    {
        promptSlug: 'create-study-guide',
        promptName: 'Create Biology Study Guide',
        promptDescription: 'Creates a study guide for a biology topic including summary, key points, and exercises.',
        promptContent: `Create a study guide for the following biology topic:\\n\\nTopic: {{topic}}\\nLevel: {{level}}\\n\\nThe guide should include:\\n- Topic summary\\n- Key points\\n- Diagrams or visualizations (describe if text-only)\\n- Practice exercises\\n- Additional resources\\n\\nOrganize the information in a clear and structured way.`,
        promptTags: ['biology', 'education', 'tutoring'],
        assets: [],
        versions: [
            {
                versionTag: 'v1.0.0'
            }
        ]
    }
];

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Educational Content & Tutoring...`);
    console.log('Assuming prior cleanup...');

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });
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

    const eduProjectSlug = 'education-content-project'; // Renombrado para claridad
    const educationProject = await prisma.project.upsert({
        where: { id: eduProjectSlug },
        update: { name: 'Education Content Generation', description: 'AI-powered educational content generation and management.', ownerUserId: testUser.id },
        create: {
            id: eduProjectSlug,
            name: 'Education Content Generation',
            description: 'AI-powered educational content generation and management.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
        },
    });
    console.log(`Upserted Project: ${educationProject.name} (ID: ${educationProject.id})`);

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

    // --- Upsert Education Prompts with Local Assets ---
    for (const promptSeed of educationPrompts) {
        const prompt = await prisma.prompt.upsert({
            where: {
                prompt_id_project_unique: {
                    id: promptSeed.promptSlug,
                    projectId: eduProjectId,
                },
            },
            update: {
                name: promptSeed.promptName,
                description: promptSeed.promptDescription,
                tags: promptSeed.promptTags ? { connect: getEduTagIds(promptSeed.promptTags) } : undefined,
            },
            create: {
                id: promptSeed.promptSlug,
                name: promptSeed.promptName,
                description: promptSeed.promptDescription,
                projectId: eduProjectId,
                tags: promptSeed.promptTags ? { connect: getEduTagIds(promptSeed.promptTags) } : undefined,
            },
            select: { id: true }
        });
        console.log(`Upserted Prompt: ${prompt.id}`);

        const assetIdMap = new Map<string, string>();
        for (const assetSeed of promptSeed.assets) {
            const assetKeySlug = slugify(assetSeed.key);
            const newAsset = await prisma.promptAsset.upsert({
                where: {
                    prompt_asset_key_unique: {
                        key: assetKeySlug,
                        promptId: prompt.id,
                        projectId: eduProjectId,
                    }
                },
                update: {},
                create: {
                    key: assetKeySlug,
                    promptId: prompt.id,
                    projectId: eduProjectId,
                },
                select: { id: true }
            });
            assetIdMap.set(assetKeySlug, newAsset.id);
            console.log(`Upserted PromptAsset: ${newAsset.id} (Key: ${assetKeySlug}) for Prompt ${prompt.id}`);
        }

        let latestVersionIdForPrompt: string | null = null;

        for (const versionSeed of promptSeed.versions) {
            const connectAssetVersionIds: { id: string }[] = [];
            if (versionSeed.assetVersions) {
                for (const avSeed of versionSeed.assetVersions) {
                    const assetKeySlug = slugify(avSeed.assetKey);
                    const assetId = assetIdMap.get(assetKeySlug);

                    if (assetId) {
                        const assetVersion = await prisma.promptAssetVersion.upsert({
                            where: {
                                assetId_versionTag: {
                                    assetId: assetId,
                                    versionTag: avSeed.versionTag,
                                }
                            },
                            update: {
                                value: avSeed.value,
                            },
                            create: {
                                assetId: assetId,
                                versionTag: avSeed.versionTag,
                                value: avSeed.value,
                            },
                            select: { id: true }
                        });
                        connectAssetVersionIds.push({ id: assetVersion.id });
                    } else {
                        console.warn(`Asset with key ${assetKeySlug} (original: ${avSeed.assetKey}) not found in assetIdMap for prompt ${promptSeed.promptSlug}. Skipping asset version.`);
                    }
                }
            }

            const newPromptVersion = await prisma.promptVersion.create({
                data: {
                    promptId: prompt.id,
                    versionTag: versionSeed.versionTag,
                    promptText: versionSeed.promptText || promptSeed.promptContent,
                    aiModelId: versionSeed.aiModelId || eduGpt4oMini.id,
                    assetVersions: {
                        connect: connectAssetVersionIds.length > 0 ? connectAssetVersionIds : undefined
                    },
                    environments: { connect: [{ id: stagingEnvironment.id }, { id: testingEnvironment.id }] },
                },
                select: { id: true }
            });
            console.log(`Created PromptVersion ${newPromptVersion.id} (Tag: ${versionSeed.versionTag}) for Prompt ${prompt.id}`);
            latestVersionIdForPrompt = newPromptVersion.id;
        }
    }

    // Crear traducciones en español
    await createSpanishTranslations(eduProjectId);

    console.log('Finished seeding Educational Content & Tutoring.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });