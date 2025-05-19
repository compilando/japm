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
        'definition-cell-biology': "La célula es la unidad fundamental y piedra angular de todos los organismos vivos conocidos, sirviendo como el bloque de construcción primario para la estructura, el motor para la función biológica y el recipiente de la información hereditaria de la vida. Representa la entidad más pequeña y autónoma capaz de exhibir todas las características de la vida.",
        'mcq-template-4-options': `**Pregunta:** {Question Text}\\n\\n*Opciones:*\\nA) {Option A}\\nB) {Option B}\\nC) {Option C}\\nD) {Option D}\\n\\n**Respuesta Correcta:** {Correct Letter}\\n**Explicación Detallada:** {Explanation Text}\\n*Objetivo de Aprendizaje:* {Opcional: Objetivo de aprendizaje específico que esta pregunta evalúa}`,
        'explanation-style-analogy': "Elabora analogías que sean vívidas, cercanas y que iluminen directamente el mecanismo o principio central del concepto. El lenguaje debe ser sencillo y atractivo para un estudiante de secundaria, asegurando que la analogía aclare en lugar de confundir. El objetivo es un momento '¡ajá!' que haga concreto lo abstracto."
    },
    prompts: {
        'generate-biology-quiz': `Elabora un cuestionario de biología completo y atractivo para estudiantes de nivel {{level}}, centrado específicamente en las complejidades de {{topic}}. El cuestionario debe incluir exactamente {{number}} preguntas, diseñadas para evaluar la comprensión a través de diversos formatos: \\n- Preguntas de opción múltiple, siguiendo la estructura definida en {{mcq_template_4_options}}.\\n- Una pregunta de respuesta corta que exija recuerdo de hechos y una breve explicación.\\n- Una pregunta de análisis en profundidad que requiera pensamiento crítico y aplicación de conceptos.\\n\\nTodas las preguntas deben ser excepcionalmente claras, adecuadamente desafiantes para el nivel especificado, e incluir explicaciones detalladas y pedagógicamente sólidas para todas las respuestas, con el fin de fomentar el aprendizaje.`,
        'explain-biology-concept': `Proporciona una explicación nítida y atractiva del concepto biológico fundamental: {{concept}}, adaptada para una audiencia de nivel {{level}}. La explicación debe ser exhaustiva e incorporar:\\n- Una definición precisa y fundamental, potencialmente extraída de {{definition_cell_biology}} si es pertinente, o de una fuente igualmente autorizada para otros conceptos.\\n- Ejemplos esclarecedores y cercanos que demuestren el concepto en acción.\\n- Analogías creativas y sencillas, elaboradas al estilo de {{explanation_style_analogy}}, para que las ideas complejas sean fácilmente asimilables.\\n- Aplicaciones prácticas del mundo real que resalten la importancia y relevancia del {{concept}}.\\n\\nAdopta un tono paciente y alentador, y utiliza un lenguaje que sea perfectamente accesible e inspirador para estudiantes de secundaria, fomentando la curiosidad y una comprensión más profunda.`,
        'create-study-guide': `Desarrolla una guía de estudio exhaustiva y altamente eficaz para el tema de biología: {{topic}}, meticulosamente adaptada para estudiantes de nivel {{level}}. Esta guía debe servir como una herramienta poderosa para la preparación de exámenes y la comprensión conceptual profunda. Estructúrala lógicamente e incluye las siguientes secciones clave:\\n- **Resumen Conciso del Tema:** Un sumario breve y atractivo de {{topic}}.\\n- **Conceptos Centrales y Puntos Clave:** Lista con viñetas de la información, definiciones y principios más críticos.\\n- **Apoyos Visuales para el Aprendizaje (Descriptivos):** Descripciones detalladas de diagramas, organigramas o modelos esenciales que aclararían visualmente aspectos complejos de {{topic}}. (ej., 'Un diagrama que ilustre las etapas de la mitosis, etiquetando claramente cada fase y las estructuras clave involucradas.')\\n- **Ejercicios Prácticos para Desarrollar Habilidades:** Un conjunto de ejercicios variados, que incluyan opción múltiple, respuesta corta y un escenario de resolución de problemas, diseñados para reforzar el aprendizaje y evaluar la comprensión.\\n- **Recursos Adicionales Seleccionados:** Una lista de 2-3 recursos externos de alta calidad (ej., sitios web educativos específicos, videos relevantes o enlaces a simulaciones) para exploración adicional.\\n\\nPrioriza la claridad, la precisión y el valor pedagógico en toda la guía.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const targetLanguageCode = 'es-ES'; // Definir el idioma objetivo

    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId,
            }
        },
        include: {
            prompt: { select: { id: true } }, // Asegurar que el id del prompt se incluye
            // languageCode: true // Asumiendo que languageCode está directamente en PromptVersion
        },
        // DEBES ASEGURARTE DE QUE EL CLIENTE PRISMA ESTÁ ACTUALIZADO Y languageCode ES UN CAMPO VÁLIDO PARA INCLUIR/SELECCIONAR
        // Si PromptVersion type no lo tiene, la query fallará.
        // Por ahora, lo consultaremos y accederemos como si existiera.
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
        // @ts-ignore // Quitar esto cuando languageCode esté en el tipo PromptVersion y en el include de la consulta
        if (version.languageCode === targetLanguageCode) {
            // @ts-ignore
            console.log(`PromptVersion ${version.id} (Prompt: ${version.prompt.id}) is already in ${targetLanguageCode}. Skipping Spanish translation.`);
            continue;
        }

        // Usar el slug del prompt como clave para la traducción
        // @ts-ignore
        const translationText = educationTranslations.prompts[version.prompt.id]; // Acceder al ID del prompt

        if (translationText) {
            await prisma.promptTranslation.upsert({
                where: {
                    versionId_languageCode: {
                        versionId: version.id,
                        languageCode: targetLanguageCode
                    }
                },
                update: {
                    promptText: translationText
                },
                create: {
                    versionId: version.id,
                    languageCode: targetLanguageCode,
                    promptText: translationText
                }
            });
            // @ts-ignore
            console.log(`Created/Updated Spanish translation for prompt version ${version.id} (Prompt: ${version.prompt.id})`);
        } else {
            // @ts-ignore
            console.warn(`No Spanish translation found in educationTranslations.prompts for prompt: ${version.prompt.id}`);
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
        promptName: 'Generate Engaging Biology Quiz',
        promptDescription: 'Generates a comprehensive and engaging biology quiz with varied question types, tailored to specific topics and student levels, including detailed explanations to foster learning.',
        promptContent: `Craft a comprehensive and engaging biology quiz for {{level}} students, specifically focusing on the intricacies of {{topic}}. The quiz must feature exactly {{number}} questions, designed to assess understanding through a variety of formats: \\n- Multiple-choice questions, adhering to the structure defined in {{mcq_template_4_options}}.\\n- One concise short-answer question demanding factual recall and brief explanation.\\n- One in-depth analysis question requiring critical thinking and application of concepts.\\n\\nAll questions must be exceptionally clear, appropriately challenging for the specified level, and include detailed, pedagogically sound explanations for all answers to foster learning.`,
        promptTags: ['biology', 'quiz', 'assessment', 'critical-thinking', 'high-school', 'education-excellence'],
        assets: [
            { key: 'mcq-template-4-options' },
        ],
        versions: [
            {
                versionTag: 'v1.0.1',
                assetVersions: [
                    {
                        assetKey: 'mcq-template-4-options',
                        versionTag: 'v1.0.1',
                        name: 'Advanced MCQ Template (4 options with Learning Objective)',
                        type: 'text',
                        description: 'Enhanced template for multiple-choice questions with four options, correct answer, detailed explanation, and an optional learning objective.',
                        value: `**Question:** {Question Text}\\n\\n*Choices:*\\nA) {Option A}\\nB) {Option B}\\nC) {Option C}\\nD) {Option D}\\n\\n**Correct Answer:** {Correct Letter}\\n**Detailed Explanation:** {Explanation Text}\\n*Learning Objective:* {Optional: Specific learning objective this question assesses}`
                    }
                ]
            }
        ]
    },
    {
        promptSlug: 'explain-biology-concept',
        promptName: 'Explain Biology Concept In-Depth',
        promptDescription: 'Provides a crystal-clear, engaging, and in-depth explanation of biological concepts for high school students, using definitions, examples, powerful analogies, and real-world applications to foster deep understanding and curiosity.',
        promptContent: `Provide a crystal-clear and engaging explanation of the core biological concept: {{concept}}, tailored for a {{level}} audience. The explanation must be comprehensive, incorporating:\\n- A precise and foundational definition, potentially drawing from {{definition_cell_biology}} if relevant, or a similarly authoritative source for other concepts.\\n- Illuminating and relatable examples that demonstrate the concept in action.\\n- Creative and simple analogies, crafted in the style of {{explanation_style_analogy}}, to make complex ideas easily digestible.\\n- Real-world practical applications that highlight the significance and relevance of the {{concept}}.\\n\\nAdopt a patient, encouraging tone and use language that is perfectly accessible and inspiring for high school students, fostering curiosity and deeper understanding.`,
        promptTags: ['biology', 'explanation', 'tutoring', 'conceptual-understanding', 'high-school', 'science-communication'],
        assets: [
            { key: 'definition-cell-biology' },
            { key: 'explanation-style-analogy' },
        ],
        versions: [
            {
                versionTag: 'v1.0.2',
                assetVersions: [
                    {
                        assetKey: 'definition-cell-biology',
                        versionTag: 'v1.0.2',
                        name: 'Foundational Definition - Cell Biology',
                        type: 'text',
                        description: 'A comprehensive and foundational definition of a cell, emphasizing its role as the cornerstone of life.',
                        value: "The cell is the fundamental, cornerstone unit of all known living organisms, serving as the primary building block for structure, the engine for biological function, and the vessel for life\\'s hereditary information. It represents the smallest, self-contained entity capable of exhibiting all the characteristics of life."
                    },
                    {
                        assetKey: 'explanation-style-analogy',
                        versionTag: 'v1.0.2',
                        name: 'Guideline for Crafting Potent Analogies',
                        type: 'text',
                        description: "Guideline for creating vivid, relatable analogies that simplify complex concepts for high school students, aiming for 'aha!' moments.",
                        value: "Craft analogies that are vivid, relatable, and directly illuminate the core mechanism or principle of the concept. The language should be simple and engaging for a high school student, ensuring the analogy clarifies rather than confuses. The goal is an \\'aha!\\' moment that makes the abstract concrete."
                    }
                ]
            }
        ]
    },
    {
        promptSlug: 'create-study-guide',
        promptName: 'Create Comprehensive Biology Study Guide',
        promptDescription: 'Develops a highly effective and comprehensive study guide for biology topics, tailored for specific student levels, to aid exam preparation and ensure deep conceptual understanding.',
        promptContent: `Develop a comprehensive and highly effective study guide for the biology topic: {{topic}}, meticulously tailored for {{level}} learners. This guide should serve as a powerful tool for exam preparation and deep conceptual understanding. Structure it logically and include the following key sections:\\n- **Concise Topic Overview:** A brief, engaging summary of {{topic}}.\\n- **Core Concepts & Key Takeaways:** Bulleted list of the most critical information, definitions, and principles.\\n- **Visual Learning Aids (Descriptive):** Detailed descriptions of essential diagrams, flowcharts, or models that would visually clarify complex aspects of {{topic}}. (e.g., 'A diagram illustrating the stages of mitosis, clearly labeling each phase and key structures involved.')\\n- **Skill-Building Practice Exercises:** A set of varied exercises, including multiple-choice, short answer, and a problem-solving scenario, designed to reinforce learning and test comprehension.\\n- **Curated Additional Resources:** A list of 2-3 high-quality external resources (e.g., specific educational websites, relevant videos, or simulation links) for further exploration.\\n\\nPrioritize clarity, accuracy, and pedagogical value throughout the guide.`,
        promptTags: ['biology', 'education', 'tutoring', 'study-guide', 'exam-preparation', 'self-learning'],
        assets: [],
        versions: [
            {
                versionTag: 'v1.0.3'
            }
        ]
    }
];

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Educational Content & Tutoring...`);
    console.log('Assuming prior cleanup...');

    const defaultLanguageCode = process.env.DEFAULT_LANGUAGE_CODE || 'en-US';
    console.log(`Using default language code: ${defaultLanguageCode}`);

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });
    // Find necessary base data
    const defaultProjectId = 'default-project'; // Assuming the default project ID

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

    // Crear Environments para el proyecto Education
    const devEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: eduProjectId } },
        update: {},
        create: { name: 'development', projectId: eduProjectId, description: 'Development environment for Education project' },
        select: { id: true }
    });
    const stagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: eduProjectId } },
        update: {},
        create: { name: 'staging', projectId: eduProjectId, description: 'Staging environment for Education project' },
        select: { id: true }
    });
    const prodEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: eduProjectId } },
        update: {},
        create: { name: 'production', projectId: eduProjectId, description: 'Production environment for Education project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${eduProjectId}`);

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
                content: promptSeed.promptContent,
                tenantId: defaultTenant.id,
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
                    languageCode: defaultLanguageCode,
                    aiModelId: versionSeed.aiModelId || eduGpt4oMini.id,
                    activeInEnvironments: { connect: [{ id: devEnv.id }, { id: stagingEnv.id }] },
                },
                select: { id: true, languageCode: true }
            });
            console.log(`Created PromptVersion ${newPromptVersion.id} (Tag: ${versionSeed.versionTag}, Lang: ${newPromptVersion.languageCode}) for Prompt ${prompt.id}`);
            if (connectAssetVersionIds.length > 0) {
                console.warn(`PromptVersion ${newPromptVersion.id} created, but associated asset versions ([${connectAssetVersionIds.map(obj => obj.id).join(', ')}]) were NOT LINKED due to schema constraints. Link them manually if needed.`);
            }
            latestVersionIdForPrompt = newPromptVersion.id;
        }
    }

    // Crear traducciones en español
    await createSpanishTranslations(eduProjectId);

    console.log('Finished seeding Educational Content & Tutoring.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });