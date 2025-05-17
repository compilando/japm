import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Traducciones específicas para el proyecto creativo
const creativeTranslations = {
    assets: {
        'main-char-profile-jax': `Jax "Wrench" Volkov: Un cíborg ex-Nova Corp marcado por la batalla, Jax es un piloto de habilidad asombrosa, con reflejos aumentados y una paciencia casi inexistente. Los fantasmas de una operación desastrosa en Titán Prime se aferran a él como estática, alimentando un cinismo arraigado y una desconfianza volátil hacia cualquier uniforme o traje. Su brazo izquierdo, un reluciente testimonio de la sobreingeniería militar, oculta un juego de herramientas de contrabando de versatilidad sorprendente. Bajo el rudo exterior y el zumbido de los servos, su directiva principal permanece inalterada: encontrar a Elara, su hermana menor, engullida por los bajos fondos de la ciudad hace años. Cada misión arriesgada, cada contacto turbio, es un paso más cerca, o eso se dice a sí mismo.`,
        'setting-neo-kyoto': `Neo-Kyoto, 2242: Una ciudad de cromo cegador y crepúsculo perpetuo, donde la lluvia empapada de neón nunca termina de limpiar la mugre. Megacorporaciones como GenTec y Saito Heavy Industries perforan el cielo ahogado por el esmog con sus torres de obsidiana, sus logos holográficos proyectando un brillo inquietante sobre las calles inferiores. La 'Aguja Uptown' es un paraíso de lujo estéril para la élite, todo superficies pulidas y tonos apagados. Desciende a los 'Niveles Kage', sin embargo, y te encontrarás en un laberinto de callejones humeantes, bazares de tecnología ilícita y pandillas de sintéticos territoriales, donde la única ley es la que puedes imponer con un rifle de pulso o una aguda línea de código. El aire vibra con mil idiomas, el aroma del ramen sintético y el constante y bajo zumbido de la ambición desenfrenada.`,
        'narrative-tone-noir': `Adopta un cyberpunk-noir crudo y atmosférico. Piensa en lluvia persistente, calles que brillan con reflejos de neón depredador y sombras que ocultan más de lo que revelan. Los personajes deben estar hastiados del mundo, operando en tonos de gris, sus motivos complejos y a menudo contradictorios. El diálogo chispea con subtexto e ingenio cínico. La voz narrativa es introspectiva, quizás un poco fatalista, observando agudamente el abismo entre el deslumbrante avance tecnológico y la corrosión del espíritu humano. Cada descripción debe servir para profundizar esta sensación de decadencia urbana y temor existencial.`
    },
    prompts: {
        'generate-scene-dialogue': `Forja una escena crucial (aproximadamente 300-400 palabras) impregnada de la atmósfera de {{setting-neo-kyoto}}. La interacción entre {{main-char-profile-jax}} y {{Secondary Character Description}} debe conducir hacia el vital {{Scene Goal / Conflict}}. El diálogo ha de ser afilado como una navaja, revelando la profundidad de los personajes, agendas ocultas y haciendo avanzar la trama, todo ello mientras se sumerge en el {{narrative-tone-noir}}. Enfatiza el 'mostrar, no contar', entretejiendo descripciones viscerales de sus acciones, lenguaje corporal sutil y el opresivo entorno que moldea sus decisiones. La escena debe dejar una pregunta persistente o una sensación de inquietud.`,
        'develop-character-story': `Insufla vida a un personaje fascinante para nuestra floreciente narrativa de ciencia ficción noir. Dado el concepto central:\nNombre: {{name}}\nRol Principal: {{role}}\nEsbozo Inicial de Trasfondo: {{background}}\n\nDesarrolla a este individuo explorando:\n- **Origen y Pasado Definitorio:** ¿Qué eventos y entornos cruciales le dieron forma? Descubre una historia de fondo rica y concisa.\n- **Motivaciones y Deseos Impulsores:** ¿Cuáles son sus objetivos manifiestos y, más importante aún, sus impulsores ocultos, quizás subconscientes? ¿Qué anhelan, temen o luchan por proteger/alcanzar?\n- **Conflictos Internos y Externos:** ¿Cuáles son las paradojas centrales dentro de ellos? ¿Qué obstáculos significativos (defectos personales, presiones sociales, fuerzas antagónicas) se interponen en su camino?\n- **Relaciones Clave y Dinámicas:** ¿Cómo interactúan con, influyen y son influenciados por otras figuras clave (p. ej., {{main-char-profile-jax}} u otros arquetipos)? ¿Cuáles son las dinámicas de poder en juego?\n- **Arco de Personaje Potencial:** Visualiza una trayectoria plausible de crecimiento, decadencia o transformación. ¿Cómo podrían cambiar al final de la historia, o fracasar trágicamente en hacerlo?\n\nTu objetivo es forjar un personaje tan vívido y multifacético que se sienta real, dejando una marca indeleble en el lector. Asegúrate de que su perfil se alinee con el {{narrative-tone-noir}} y el mundo de {{setting-neo-kyoto}}.`,
        'world-building-detail': `Expande el tapiz inmersivo de nuestro universo de ciencia ficción noir detallando una faceta específica de su existencia. Céntrate en:\nAspecto a Desarrollar: {{aspect}} (p. ej., una tecnología ilegal específica, una subcultura única, el funcionamiento interno de una megacorporación poderosa, un evento histórico olvidado que proyecta largas sombras).\nContexto de Ubicación Principal: {{location}} (p. ej., las profundidades de los Niveles Kage, la opulenta Aguja, una estación espacial abandonada en la órbita de Neo-Kyoto).\n\nTu exploración de construcción de mundo debe entretejer intrincadamente:\n- **Manifestación Sensorial y Física:** ¿Cómo se ve, suena, se siente, huele o sabe este aspecto? Proporciona descripciones físicas vívidas.\n- **Tejido Sociocultural:** ¿Cómo se integra o se rebela contra los sistemas sociales predominantes de {{setting-neo-kyoto}}? ¿Cuáles son sus jerarquías, rituales o reglas tácitas?\n- **Bases e Implicaciones Tecnológicas:** ¿Qué tecnología lo habilita o define? ¿Cuáles son sus consecuencias previstas e imprevistas?\n- **Susurros de Historia y Lore:** ¿Cuál es su historia de origen o contexto histórico relevante? ¿Existen mitos o leyendas a su alrededor?\n- **Potencial Narrativo y Ganchos de Trama:** ¿Cómo puede este elemento impactar directamente la trama, crear conflictos, ofrecer oportunidades o revelar verdades más profundas sobre el mundo y sus habitantes (especialmente personajes como {{main-char-profile-jax}})?\n\nEsfuérzate por una adición rica, coherente y que invite a la reflexión, que mejore la verosimilitud y las posibilidades narrativas de nuestro mundo, resonando con el {{narrative-tone-noir}} establecido.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);

    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        include: {
            prompt: { select: { id: true } } // Solo necesitamos el id (slug) del prompt padre
        }
    });

    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: {
            asset: { // Filtro a través de PromptAsset
                prompt: { // PromptAsset está vinculado a un Prompt
                    projectId: projectId // Y el Prompt tiene el projectId
                }
            }
        },
        include: {
            asset: { select: { key: true } } // Incluir el PromptAsset y seleccionar su 'key'
        }
    });

    for (const version of promptVersions) {
        const translationKey = version.prompt.id; // Este es el slug del prompt, ej: 'generate-scene'
        const translationText = creativeTranslations.prompts[translationKey] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
            update: { promptText: translationText },
            create: { versionId: version.id, languageCode: 'es-ES', promptText: translationText }
        });
        console.log(`Created Spanish translation for prompt version ${version.id} (prompt slug: ${translationKey})`);
    }

    for (const version of promptAssetVersions) {
        if (version.asset && version.asset.key) { // Asegurar que asset y asset.key existen
            const translationText = creativeTranslations.assets[version.asset.key] || version.value;
            await prisma.assetTranslation.upsert({
                where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
                update: { value: translationText },
                create: { versionId: version.id, languageCode: 'es-ES', value: translationText }
            });
            console.log(`Created Spanish translation for prompt asset version ${version.id} (asset key: ${version.asset.key})`);
        } else {
            console.warn(`Skipping translation for asset version ${version.id} due to missing asset key.`);
        }
    }
    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

// Definición de la función slugify (copiada de seed.codegen.ts)
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
    console.log(`Start seeding for Creative Writing & Adaptation...`);
    console.log('Assuming prior cleanup...');

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });

    const creativeProject = await prisma.project.upsert({
        where: { id: 'creative-content-project' },
        update: { name: 'Creative Content Generation', description: 'AI-powered creative content generation and ideation.', ownerUserId: testUser.id },
        create: {
            id: 'creative-content-project',
            name: 'Creative Content Generation',
            description: 'AI-powered creative content generation and ideation.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
        },
    });
    console.log(`Upserted Project: ${creativeProject.name}`);
    const crProjectId = creativeProject.id;

    // Crear Environments para el proyecto Creative
    const crDevEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: crProjectId } },
        update: {},
        create: { name: 'development', projectId: crProjectId, description: 'Development environment for Creative project' },
        select: { id: true }
    });
    const crStagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: crProjectId } },
        update: {},
        create: { name: 'staging', projectId: crProjectId, description: 'Staging environment for Creative project' },
        select: { id: true }
    });
    const crProdEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: crProjectId } },
        update: {},
        create: { name: 'production', projectId: crProjectId, description: 'Production environment for Creative project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${crProjectId}`);

    await createSpanishRegionAndCulturalData(crProjectId);
    await createUSRegionAndCulturalData(crProjectId);

    const crGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: crProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: crProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const crGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: crProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: crProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${crProjectId}`);

    const crPrefix = 'cr_';
    const crBaseTags = ['creative-writing', 'sci-fi', 'character-dev', 'world-building', 'dialogue', 'plot-outline', 'adaptation'];
    const crTagMap: Map<string, string> = new Map();

    for (const baseTagName of crBaseTags) {
        const tagName = `${crPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: crProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: crProjectId },
            select: { id: true }
        });
        crTagMap.set(tagName, tag.id);
        console.log(`Upserted Tag: ${tagName} for project ${crProjectId}`);
    }

    const getCrTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => crTagMap.get(`${crPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // Definición de los Prompts Temáticos con sus assets locales
    const creativeProjectPrompts: {
        id: string;
        name: string;
        description: string;
        promptText: string;
        tags: string[];
        assets?: { key: string; name: string; initialValue: string; initialChangeMessage?: string }[];
        aiModelId?: string; // ID del AIModel a usar (opcional, usará el del proyecto si no)
        activeInEnvironments?: { id: string }[];
    }[] = [
            {
                id: slugify('generate-scene-dialogue'),
                name: 'Generate Pivotal Dialogue Scene',
                description: 'Crafts a pivotal, atmospheric dialogue-driven scene in a cyberpunk-noir setting, focusing on character depth and plot advancement.',
                promptText: `Forge a pivotal scene (approximately 300-400 words) drenched in the atmosphere of {{setting-neo-kyoto}}. The interaction between {{main-char-profile-jax}} and {{Secondary Character Description}} must drive towards the crucial {{Scene Goal / Conflict}}. Dialogue must be razor-sharp, revealing character depth, hidden agendas, and advancing the plot, all while steeped in the {{narrative-tone-noir}}. Emphasize 'show, don\'t tell,' weaving in visceral descriptions of their actions, subtle body language, and the oppressive environment that shapes their choices. The scene should leave a lingering question or a sense of unease.`,
                tags: ['creative-writing', 'sci-fi-noir', 'dialogue-crafting', 'scene-development', 'plot-progression'],
                assets: [
                    {
                        key: 'setting-neo-kyoto',
                        name: 'Neo-Kyoto Setting Details (Cyberpunk-Noir)',
                        initialValue: `Neo-Kyoto, 2242: A city of blinding chrome and perpetual twilight, where the neon-drenched rain never quite washes away the grime. Mega-corporations like GenTec and Saito Heavy Industries pierce the smog-choked sky with their obsidian towers, their holographic logos casting an eerie glow over the streets below. The 'Uptown Spire' is a haven of sterile luxury for the elite, all polished surfaces and hushed tones. Descend into the 'Kage Levels,' however, and you\'re in a labyrinth of steaming alleyways, illicit tech bazaars, and territorial synth-gangs, where the only law is what you can enforce with a pulse rifle or a sharp line of code. The air thrums with a thousand languages, the scent of synthetic ramen, and the constant, low hum of unchecked ambition.`
                    },
                    {
                        key: 'main-char-profile-jax',
                        name: 'Main Character Profile: Jax "Wrench" Volkov',
                        initialValue: `Jax "Wrench" Volkov: A battle-scarred ex-Nova Corp cyborg, Jax is a pilot of uncanny skill, his reflexes augmented, his patience paper-thin. The ghosts of a disastrous op on Titan Prime cling to him like static, fueling a deep-seated cynicism and a volatile distrust of any uniform or suit. His left arm, a gleaming testament to military over-engineering, conceals a contraband toolkit of surprising versatility. Beneath the gruff exterior and the hum of servos, his core directive remains unaltered: find Elara, his younger sister, swallowed by the city\'s underbelly years ago. Every risky run, every shady contact, is a step closer, or so he tells himself.`
                    },
                    {
                        key: 'narrative-tone-noir',
                        name: 'Narrative Tone Guidelines: Cyberpunk-Noir',
                        initialValue: `Embrace a gritty, atmospheric cyberpunk-noir. Think persistent rain, streets gleaming with reflections of predatory neon, and shadows that hide more than they reveal. Characters should be world-weary, operating in shades of grey, their motives complex and often contradictory. Dialogue crackles with subtext and cynical wit. The narrative voice is introspective, perhaps a little fatalistic, keenly observing the chasm between dazzling technological advancement and the corrosion of the human spirit. Every description should serve to deepen this sense of urban decay and existential dread.`
                    }
                ],
                aiModelId: crGpt4o.id,
                activeInEnvironments: [{ id: crDevEnv.id }, { id: crStagingEnv.id }]
            },
            {
                id: slugify('develop-character-story'),
                name: 'Develop Compelling Sci-Fi Noir Character',
                description: 'Breathes life into a sci-fi noir character, focusing on backstory, motivations, conflicts, relationships, and potential arc to create a vivid, memorable individual.',
                promptText: `Breathe life into a compelling character for our burgeoning sci-fi noir narrative. Given the core concept:\nName: {{name}}\nPrimary Role: {{role}}\nInitial Background Sketch: {{background}}\n\nFlesh out this individual by exploring:\n- **Origin & Defining Past:** What pivotal events and environments shaped them? Uncover a rich, concise backstory.\n- **Driving Motivations & Desires:** What are their overt goals and, more importantly, their hidden, perhaps subconscious, drivers? What do they yearn for, fear, or fight to protect/achieve?\n- **Internal & External Conflicts:** What are the central paradoxes within them? What significant obstacles (personal flaws, societal pressures, antagonistic forces) stand in their way?\n- **Key Relationships & Dynamics:** How do they interact with, influence, and get influenced by other key figures (e.g., {{main-char-profile-jax}} or other archetypes)? What are the power dynamics at play?\n- **Potential Character Arc:** Envision a plausible trajectory of growth, decay, or transformation. How might they change by the story\'s end, or tragically fail to?\n\nYour goal is to forge a character so vivid and multifaceted they feel real, leaving an indelible mark on the reader. Ensure their profile aligns with the {{narrative-tone-noir}} and the world of {{setting-neo-kyoto}}.`,
                tags: ['creative-writing', 'character-creation', 'sci-fi-noir', 'narrative-design', 'deep-character'],
                aiModelId: crGpt4o.id,
                activeInEnvironments: [{ id: crDevEnv.id }, { id: crStagingEnv.id }]
            },
            {
                id: slugify('world-building-detail'),
                name: 'Detailed World-Building Element (Sci-Fi Noir)',
                description: 'Expands a specific aspect of the sci-fi noir universe, focusing on sensory details, socio-cultural impact, technology, history, and narrative potential.',
                promptText: `Expand the immersive tapestry of our sci-fi noir universe by detailing a specific facet of its existence. Focus on:\nAspect to Develop: {{aspect}} (e.g., a specific illegal technology, a unique subculture, a powerful mega-corporation\'s internal workings, a forgotten historical event casting long shadows).\nPrimary Location Context: {{location}} (e.g., the depths of the Kage Levels, the opulent Spire, a derelict space station in Neo-Kyoto\'s orbit).\n\nYour world-building exploration should intricately weave together:\n- **Sensory & Physical Manifestation:** How does this aspect look, sound, feel, smell, or taste? Provide vivid physical descriptions.\n- **Socio-Cultural Fabric:** How does it integrate with or rebel against the prevailing social systems of {{setting-neo-kyoto}}? What are its hierarchies, rituals, or unspoken rules?\n- **Technological Underpinnings & Implications:** What technology enables or defines it? What are its intended and unintended consequences?\n- **Whispers of History & Lore:** What is its origin story or relevant historical context? Are there myths or legends surrounding it?\n- **Narrative Potential & Plot Hooks:** How can this element directly impact the plot, create conflict, offer opportunities, or reveal deeper truths about the world and its inhabitants (especially characters like {{main-char-profile-jax}})?\n\nStrive for a rich, coherent, and thought-provoking addition that enhances the verisimilitude and narrative possibilities of our world, resonating with the established {{narrative-tone-noir}}.`,
                tags: ['creative-writing', 'world-building', 'sci-fi-noir', 'setting-design', 'narrative-depth'],
                assets: [
                    {
                        key: 'setting-neo-kyoto',
                        name: 'Neo-Kyoto Setting Details (Cyberpunk-Noir)',
                        initialValue: `Neo-Kyoto, 2242: A city of blinding chrome and perpetual twilight, where the neon-drenched rain never quite washes away the grime. Mega-corporations like GenTec and Saito Heavy Industries pierce the smog-choked sky with their obsidian towers, their holographic logos casting an eerie glow over the streets below. The 'Uptown Spire' is a haven of sterile luxury for the elite, all polished surfaces and hushed tones. Descend into the 'Kage Levels,' however, and you\'re in a labyrinth of steaming alleyways, illicit tech bazaars, and territorial synth-gangs, where the only law is what you can enforce with a pulse rifle or a sharp line of code. The air thrums with a thousand languages, the scent of synthetic ramen, and the constant, low hum of unchecked ambition.`
                    }
                ],
                aiModelId: crGpt4o.id,
                activeInEnvironments: [{ id: crDevEnv.id }, { id: crStagingEnv.id }]
            }
        ];

    for (const promptData of creativeProjectPrompts) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptData.id, projectId: crProjectId } },
            update: {
                name: promptData.name,
                description: promptData.description,
                tags: { connect: getCrTagIds(promptData.tags) }
            },
            create: {
                id: promptData.id,
                name: promptData.name,
                description: promptData.description,
                project: { connect: { id: crProjectId } },
                tags: { connect: getCrTagIds(promptData.tags) },
            },
        });
        console.log(`Upserted Prompt: ${prompt.name} (ID: ${prompt.id}) in project ${crProjectId}`);

        if (promptData.assets) {
            for (const assetInfo of promptData.assets) {
                const asset = await prisma.promptAsset.upsert({
                    where: {
                        prompt_asset_key_unique: {
                            promptId: prompt.id,
                            projectId: crProjectId,
                            key: assetInfo.key,
                        }
                    },
                    update: {},
                    create: {
                        key: assetInfo.key,
                        promptId: prompt.id,
                        projectId: crProjectId,
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
                    console.log(`Created initial version for asset ${asset.key} in prompt ${prompt.id}`);
                } else if (version.value !== assetInfo.initialValue) {
                    await prisma.promptAssetVersion.update({
                        where: { id: version.id },
                        data: { value: assetInfo.initialValue, changeMessage: `Updated initial value for ${assetInfo.name} during seed` }
                    });
                    console.log(`Updated initial version for asset ${asset.key} in prompt ${prompt.id}`);
                }
            }
        }

        await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptData.promptText,
                status: 'active',
                changeMessage: `Initial version for ${promptData.name}. (Updated via upsert)`,
                activeInEnvironments: { set: promptData.activeInEnvironments || [{ id: crDevEnv.id }, { id: crStagingEnv.id }] },
                aiModelId: promptData.aiModelId || crGpt4o.id
            },
            create: {
                promptId: prompt.id,
                promptText: promptData.promptText,
                versionTag: 'v1.0.0', status: 'active',
                changeMessage: `Initial version for ${promptData.name}.`,
                activeInEnvironments: { connect: promptData.activeInEnvironments || [{ id: crDevEnv.id }, { id: crStagingEnv.id }] },
                aiModelId: promptData.aiModelId || crGpt4o.id
            },
        });
        console.log(`Upserted PromptVersion for ${prompt.name} V1`);
    }

    await createSpanishTranslations(crProjectId);
    console.log(`Finished seeding Creative Writing & Adaptation.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });