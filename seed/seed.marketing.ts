import { PrismaClient, MarketplacePublishStatus, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Traducciones específicas para el proyecto de marketing
const marketingTranslations = {
    assets: {
        'brand-voice-eco': `**Voz de Marca - Conciencia Ecológica y Sostenibilidad:**\n        *   **Principios Fundamentales:** Autenticidad, transparencia radical, educar e inspirar.\n        *   **Enfoque Central:** Comunicar de manera creíble nuestro compromiso con la sostenibilidad, el impacto ambiental positivo y las prácticas éticas.\n        *   **Tono:** Optimista y esperanzador, pero firmemente anclado en la realidad y la ciencia. Apasionado por el cambio positivo. Evitar la jerga excesiva; preferir lenguaje claro y accesible.\n        *   **Evitar Absolutamente:** Greenwashing, afirmaciones no verificables, exageraciones, lenguaje condescendiente o alarmista.\n        *   **Palabras Clave Positivas:** Regenerativo, circular, impacto reducido, consciente, responsable, empoderar, comunidad, futuro sostenible, innovador, ético.\n        *   **Ejemplos de Tono:**\n            *   \"Juntos, estamos cultivando un futuro más verde. Descubre cómo nuestras últimas innovaciones minimizan el impacto y maximizan el bienestar.\"\n            *   \"Creemos en la transparencia. Por eso, compartimos abiertamente nuestros avances y desafíos en el camino hacia una operatividad 100% sostenible.\"\n            *   \"Pequeños cambios, gran impacto. Únete a nuestra comunidad de agentes de cambio y explora soluciones sostenibles para el día a día.\"\n        *   **Llamadas a la Acción:** Deben inspirar participación y acción informada (ej. \"Aprende más sobre nuestra huella\", \"Únete al movimiento\", \"Elige sostenible\").`,
        'target-audience-millennials': `**Perfil Detallado de Audiencia Objetivo: Millennials Eco-Conscientes y Digitalmente Nativos**\n\n        *   **A. Demografía Clave:**\n            *   **Rango de Edad:** Aproximadamente 28-42 años.\n            *   **Ubicación Primaria:** Zonas urbanas y suburbanas con acceso a información y comunidades con ideas afines (global, con enfoque en mercados desarrollados y emergentes con creciente conciencia ecológica).\n            *   **Nivel de Ingresos:** Medio a medio-alto, con poder adquisitivo para tomar decisiones de compra basadas en valores, aunque sensibles al precio justo.\n            *   **Educación:** Mayoritariamente con educación superior.\n        *   **B. Psico-grafía y Estilo de Vida:**\n            *   **Valores Fundamentales:** Sostenibilidad, autenticidad, impacto social, transparencia de marca, salud y bienestar (personal y planetario), individualidad, comunidad, experiencias sobre posesiones materiales.\n            *   **Intereses y Hobbies:** Consumo ético, productos orgánicos/naturales, tecnología, viajes sostenibles, activismo social (online y offline), fitness y bienestar, DIY, economía colaborativa, desarrollo personal.\n            *   **Consumo de Medios:** Altamente digitales. Usuarios activos de redes sociales (Instagram, YouTube, TikTok para inspiración y descubrimiento; Twitter/X, LinkedIn para noticias y profesional), podcasts, blogs especializados, plataformas de streaming. Valoran las recomendaciones de influencers auténticos y de pares.\n        *   **C. Necesidades y Puntos de Dolor (Relacionados con el Producto/Servicio):**\n            *   **Búsqueda de Autenticidad:** Frustración con el \"greenwashing\" y la falta de transparencia de las marcas.\n            *   **Deseo de Impacto:** Quieren sentir que sus compras contribuyen a un bien mayor, pero a menudo se sienten abrumados por la complejidad de las opciones sostenibles.\n            *   **Conveniencia vs. Valores:** Luchan por equilibrar sus valores éticos con la conveniencia y disponibilidad de productos/servicios.\n            *   **Sobrecarga de Información:** Dificultad para discernir información creíble sobre sostenibilidad y para identificar marcas verdaderamente responsables.\n            *   **Sentido de Comunidad:** Buscan conectar con marcas y personas que comparten sus valores.\n        *   **D. Comportamiento de Compra:**\n            *   Investigan exhaustivamente online antes de comprar. Leen reseñas, comparan, buscan certificaciones.\n            *   Leales a marcas que demuestran un compromiso genuino y consistente con sus valores.\n            *   Dispuestos a pagar un premium moderado por productos éticos y sostenibles si el valor y la calidad son claros.\n            *   Influenciados por el storytelling de la marca y el impacto social/ambiental tangible.`,
        'standard-ctas-marketing': `**Llamadas a la Acción (CTAs) Estándar para Marketing:**\n\n        *   **Descubrimiento e Información:**\n            *   \"Descubre Más\" / \"Explora Ahora\"\n            *   \"Ver Detalles\" / \"Conoce la Historia Completa\"\n            *   \"Lee Nuestro Blog\" / \"Accede al Informe\"\n            *   \"Descarga la Guía Gratuita\" / \"Obtén tu Checklist\"\n        *   **Consideración y Comunidad:**\n            *   \"Únete a la Conversación\" / \"Comparte tu Opinión\"\n            *   \"Regístrate para Novedades\" / \"Suscríbete al Boletín\"\n            *   \"Síguenos en [Plataforma]\" / \"Conecta con Nosotros\"\n            *   \"Mira el Testimonio\" / \"Lee Casos de Éxito\"\n        *   **Decisión y Compra:**\n            *   \"Compra Ahora\" / \"Añadir al Carrito\"\n            *   \"Consigue tu [Producto/Oferta]\" / \"Reserva tu Plaza\"\n            *   \"Solicita una Demostración\" / \"Habla con un Experto\"\n            *   \"Empieza tu Prueba Gratuita\" / \"Reclama tu Descuento\"\n        *   **Post-Interacción y Fidelización:**\n            *   \"Deja una Reseña\" / \"Valora tu Experiencia\"\n            *   \"Recomienda a un Amigo\"\n            *   \"Visita Nuestro Centro de Ayuda\"\n        *   **Específicos de Evento/Campaña:**\n            *   \"Regístrate Aquí (Plazas Limitadas)\"\n            *   \"Participa en el Sorteo\"\n            *   \"Vota Ahora\"`
        // 'social-media-tone' key fue eliminada ya que su contenido eran CTAs. Si se necesita un tono específico para redes, se debe crear un nuevo asset.
    },
    prompts: {
        'generate-social-post': `Genera 3-5 ideas creativas y atractivas para publicaciones en redes sociales (especificar plataforma si es relevante, ej., Instagram, LinkedIn, Twitter/X) dirigidas a la siguiente audiencia:\n        {{target-audience-persona}}\n\n        Las publicaciones deben centrarse en temas relacionados con: {{Topic Focus / Campaign Theme}}.\n\n        Objetivos de las Publicaciones: {{Primary Objective: e.g., Awareness, Engagement, Lead Generation, Traffic to Website}}\n\n        Para cada idea, proporciona:\n        1.  **Concepto Principal/Ángulo:** (1-2 frases)\n        2.  **Texto Sugerido del Post:** (Incluir hashtags relevantes y emojis si aplica)\n        3.  **Sugerencia Visual:** (ej., imagen de stock, video corto, infografía, GIF, UGC)\n        4.  **Llamada a la Acción (CTA) Propuesta:** (Utilizar {{standard-ctas-marketing}} como referencia o proponer una específica)\n\n        Asegura que las ideas sean originales, compartibles, optimizadas para engagement y, si aplica, SEO-friendly para la plataforma. Considerar el {{brand-voice-eco}} (si es relevante).`,
        'create-email-campaign': `Diseña una campaña de email marketing de {{Número de Emails en la Secuencia, ej., 3}} correos, con las siguientes características:\n\n        Audiencia Destino: {{audience_segment_description}} (Referenciar {{target-audience-millennials}} si aplica y refinar)\n        Objetivo Principal de la Campaña: {{objective: e.g., Nurturing de Leads, Promoción de Nuevo Producto, Reactivación de Clientes, Anuncio de Evento}}\n        Tema Central / Oferta: {{topic_or_offer_details}}\n\n        Para cada email en la secuencia, desarrolla:\n        1.  **Propósito del Email dentro de la Secuencia:** (ej., Introducción y problema, Presentación de solución, Prueba social y urgencia, Última oportunidad)\n        2.  **Asunto Atractivo:** (Optimizado para apertura, <50 caracteres idealmente, considerar emojis)\n        3.  **Pre-encabezado (Preview Text):** (Extensión del asunto, ~90 caracteres)\n        4.  **Cuerpo del Email:**\n            *   Hook/Apertura: Captar interés inmediato.\n            *   Contenido Principal: Desarrollar el tema, aportar valor, destacar beneficios.\n            *   Prueba Social (si aplica): Testimonios, logos de clientes, cifras.\n            *   Oferta (si aplica): Clara y concisa.\n            *   Personalización: Indicar dónde se usarían campos como {{FirstName}}.\n        5.  **Llamada a la Acción (CTA) Principal:** Clara, visible y persuasiva (usar {{standard-ctas-marketing}} o una específica).\n        6.  **CTA Secundaria (Opcional):**\n        7.  **Segmentación Sugerida para Envío/Disparador:** (ej., Nuevos suscriptores, Carrito abandonado, Inactivos >90 días, Interesados en Categoría X)\n        8.  **Métricas Clave a Rastrear para este Email:** (ej., Tasa de Apertura, CTR, Conversiones)\n\n        Consideraciones Generales de la Campaña:\n        -   Mantener coherencia con la voz de marca (referenciar {{brand-voice-eco}} si aplica).\n        -   Optimizar para legibilidad en móviles.\n        -   Sugerir timing/frecuencia de envío entre emails.\n        -   Asegurar cumplimiento de normativas (ej., GDPR, CAN-SPAM con enlace de baja visible).`,
        'brand-messaging': `Desarrollar la mensajería de marca estratégica para la siguiente iniciativa clave:\n\n        Iniciativa/Producto/Servicio: {{initiative_description}}\n        Audiencia Objetivo Principal: {{audience_details}} (Referenciar {{target-audience-millennials}} si aplica y detallar más)\n        Canal(es) de Comunicación Primarios: {{channel_list_e_g_website_social_media_press_release}}\n        Objetivo de la Mensajería: {{messaging_goal_e_g_awareness_differentiation_adoption_trust}}\n\n        Componentes Clave de la Mensajería a Desarrollar:\n        1.  **Propuesta Única de Valor (PUV):** ¿Qué ofrecemos de manera única y por qué debería importarle a la audiencia? (1-2 frases concisas y potentes).\n        2.  **Pilares de Mensajería (3-4):** Temas o beneficios centrales que sustentan la PUV.\n            *   Pilar 1: {{Pillar1_Theme}}\n                *   Mensaje Clave:\n                *   Puntos de Apoyo/Pruebas:\n            *   Pilar 2: {{Pillar2_Theme}}\n                *   Mensaje Clave:\n                *   Puntos de Apoyo/Pruebas:\n            *   (Añadir más pilares según sea necesario)\n        3.  **Beneficios Clave para la Audiencia:** Traducir características en ventajas y resultados tangibles para el público objetivo.\n        4.  **Elevator Pitch (30 segundos):** Un resumen verbal rápido y convincente.\n        5.  **Tagline/Lema (Opcional):** Si aplica para la iniciativa.\n        6.  **Tono de Voz Específico para la Iniciativa:** (Debe alinearse con {{brand-voice-eco}} general, pero puede tener matices. Ej: más urgente, más inspirador, más técnico).\n        7.  **Palabras Clave Esenciales:** Términos SEO y de marca a integrar consistentemente.\n        8.  **Qué Evitar (Consideraciones Negativas):** Mensajes confusos, jerga, promesas excesivas.\n\n        Asegurar que toda la mensajería sea coherente, auténtica, diferenciadora y resuene profundamente con la audiencia objetivo, alineándose con la estrategia de marca global.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const targetLanguageCode = 'es-ES'; // Definir el idioma objetivo

    // Obtener todas las promptversion y promptassetversion del proyecto
    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        // @ts-ignore // Quitar cuando languageCode esté en el tipo y en el include
        include: {
            prompt: { select: { id: true } }, // Incluir el id del prompt para buscar en marketingTranslations
            // languageCode: true // Asegúrate de que tu cliente Prisma está actualizado
        }
    });

    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: {
            asset: {
                projectId: projectId
            }
        },
        include: {
            asset: true
        }
    });

    // Crear traducciones para promptversion
    for (const version of promptVersions) {
        // @ts-ignore // Quitar cuando languageCode esté en el tipo y en el include
        if (version.languageCode === targetLanguageCode) {
            // @ts-ignore
            console.log(`PromptVersion ${version.id} (Prompt: ${version.prompt.id}) is already in ${targetLanguageCode}. Skipping Spanish translation.`);
            continue;
        }
        // @ts-ignore
        const translation = marketingTranslations.prompts[version.prompt.id] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: {
                versionId_languageCode: {
                    versionId: version.id,
                    languageCode: targetLanguageCode
                }
            },
            update: {
                promptText: translation
            },
            create: {
                versionId: version.id,
                languageCode: targetLanguageCode,
                promptText: translation
            }
        });
        // @ts-ignore
        console.log(`Created Spanish translation for prompt version ${version.id}`);
    }

    // Crear traducciones para promptassetversion
    for (const version of promptAssetVersions) {
        const translation = marketingTranslations.assets[version.asset.key] || version.value;
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
        console.log(`Created Spanish translation for prompt asset version ${version.id}`);
    }

    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

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
    console.log(`Start seeding for Marketing Content...`);
    console.log('Assuming prior cleanup...');

    const defaultLanguageCode = process.env.DEFAULT_LANGUAGE_CODE || 'en-US';
    console.log(`Using default language code: ${defaultLanguageCode}`);

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: { role: Role.TENANT_ADMIN }, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } }, role: Role.TENANT_ADMIN } });

    // Upsert Marketing Project
    const marketingProject = await prisma.project.upsert({
        where: { id: 'marketing-content-project' },
        update: { name: 'Marketing Content Generation', description: 'AI-powered marketing content generation and optimization.', ownerUserId: testUser.id },
        create: {
            id: 'marketing-content-project',
            name: 'Marketing Content Generation',
            description: 'AI-powered marketing content generation and optimization.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
        },
    });
    console.log(`Upserted Project: ${marketingProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto Marketing
    await createSpanishRegionAndCulturalData(marketingProject.id);
    // Crear región en-US y datos culturales para el proyecto Marketing
    await createUSRegionAndCulturalData(marketingProject.id);

    const mktProjectId = marketingProject.id; // Usar una variable consistente para el ID del proyecto

    // Crear Environments para el proyecto Marketing
    const mktDevEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: mktProjectId } },
        update: {},
        create: { name: 'development', projectId: mktProjectId, description: 'Development environment for Marketing project' },
        select: { id: true }
    });
    const mktStagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: mktProjectId } },
        update: {},
        create: { name: 'staging', projectId: mktProjectId, description: 'Staging environment for Marketing project' },
        select: { id: true }
    });
    const mktProdEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: mktProjectId } },
        update: {},
        create: { name: 'production', projectId: mktProjectId, description: 'Production environment for Marketing project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${mktProjectId}`);

    // Create specific AI models for this project
    const mktGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: marketingProject.id, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: marketingProject.id, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const mktGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: marketingProject.id, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: marketingProject.id, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${marketingProject.id}`);

    // Upsert Marketing Tags with prefix
    const mktPrefix = 'mkt_';
    const mktBaseTags = ['marketing', 'social-media', 'blog-post', 'email-campaign', 'seo'];
    const mktTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of mktBaseTags) {
        const tagName = `${mktPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: marketingProject.id, name: tagName } },
            update: {}, // No specific fields to update
            create: { name: tagName, projectId: marketingProject.id },
            select: { id: true } // Select ID
        });
        mktTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${marketingProject.id}`);
    }
    // Helper function to get tag IDs
    const getMktTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => mktTagMap.get(`${mktPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // Crear un Prompt padre para los assets comunes de Marketing
    const mktCommonAssetsPromptSlug = 'marketing-common-assets';
    const mktCommonAssetsPrompt = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: mktCommonAssetsPromptSlug,
                projectId: marketingProject.id,
            },
        },
        update: { name: 'Marketing Common Assets' },
        create: {
            id: mktCommonAssetsPromptSlug,
            name: 'Marketing Common Assets',
            description: 'Common reusable assets for Marketing prompts.',
            projectId: marketingProject.id,
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt for common Marketing assets: ${mktCommonAssetsPrompt.id}`);

    // --- Marketing Prompts & Initial Versions ---
    const promptSeeds = [
        {
            id: 'generate-social-post',
            name: 'Generate Engaging Social Media Posts',
            description: 'Generates 3-5 creative and engaging social media post ideas based on audience, topic, and objectives.',
            promptText: marketingTranslations.prompts['generate-social-post'],
            tags: ['social-media', 'content-creation', 'engagement', 'marketing-campaign'],
            assetKeys: ['target-audience-persona', 'standard-ctas-marketing', 'brand-voice-eco'], // Claves de assets comunes a conectar
            aiModelId: mktGpt4o.id
        },
        {
            id: 'create-email-campaign',
            name: 'Design Multi-Step Email Campaign',
            description: 'Designs a multi-email marketing campaign sequence tailored to audience, objective, and theme.',
            promptText: marketingTranslations.prompts['create-email-campaign'],
            tags: ['email-marketing', 'campaign-planning', 'lead-nurturing', 'automation'],
            assetKeys: ['target-audience-millennials', 'standard-ctas-marketing', 'brand-voice-eco'],
            aiModelId: mktGpt4o.id
        },
        {
            id: 'brand-messaging',
            name: 'Develop Strategic Brand Messaging',
            description: 'Develops strategic brand messaging for a key initiative, including UVP, pillars, and tone of voice.',
            promptText: marketingTranslations.prompts['brand-messaging'],
            tags: ['branding', 'marketing-strategy', 'value-proposition', 'communication'],
            assetKeys: ['target-audience-millennials', 'brand-voice-eco'],
            aiModelId: mktGpt4o.id
        }
    ];

    for (const promptSeed of promptSeeds) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptSeed.id, projectId: mktProjectId } },
            update: { name: promptSeed.name, description: promptSeed.description, tags: { connect: getMktTagIds(promptSeed.tags) } },
            create: {
                id: promptSeed.id,
                name: promptSeed.name,
                description: promptSeed.description,
                projectId: mktProjectId,
                tags: { connect: getMktTagIds(promptSeed.tags) },
            },
            select: { id: true }
        });
        console.log(`Upserted Prompt: ${promptSeed.name} (ID: ${prompt.id})`);

        // Crear PromptVersion inicial para cada prompt
        const promptVersion = await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptSeed.promptText,
                aiModelId: promptSeed.aiModelId || mktGpt4oMini.id, // Usar el modelo del seed o un default
                status: 'active',
                changeMessage: `Initial version of ${promptSeed.name}`,
                languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
                activeInEnvironments: { set: [{ id: mktDevEnv.id }] } // Default a dev
            },
            create: {
                promptId: prompt.id,
                promptText: promptSeed.promptText,
                versionTag: 'v1.0.0',
                aiModelId: promptSeed.aiModelId || mktGpt4oMini.id,
                status: 'active',
                changeMessage: `Initial version of ${promptSeed.name}`,
                languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
                activeInEnvironments: { connect: [{ id: mktDevEnv.id }] } // Default a dev
            },
            select: { id: true, languageCode: true } // Asegurar que se selecciona languageCode
        });
        console.log(`Upserted PromptVersion ${promptVersion.id} (Lang: ${promptVersion.languageCode}) for prompt ${promptSeed.name}`);

        // Conectar Assets Comunes (si existen y están definidos en assetKeys)
        // Esta lógica asume que los assets ya fueron creados bajo mktCommonAssetsPrompt
        // y que la relación PromptVersion -> PromptAssetVersion (o PromptVersion -> PromptAsset) se maneja adecuadamente
        // según el schema. El código actual no crea explícitamente PromptAssetVersion para estos assets comunes aquí.
        // Simplemente registra que se intentaría una conexión si el schema lo permitiera de forma directa.
        if (promptSeed.assetKeys && promptSeed.assetKeys.length > 0) {
            // Ejemplo de cómo podrías conectar si tuvieras una relación directa PromptVersion -> PromptAsset
            // Esto es ESPECULATIVO y depende de tu schema exacto
            // const assetsToConnect = await prisma.promptAsset.findMany({
            //     where: {
            //         key: { in: promptSeed.assetKeys },
            //         projectId: mktProjectId, // O mktCommonAssetsPrompt.projectId si son globales al proyecto
            //         promptId: mktCommonAssetsPrompt.id // Asegurarse que son los assets del prompt común
            //     },
            //     select: { id: true }
            // });

            // if (assetsToConnect.length > 0) {
            //     // Necesitarías PromptAssetVersions para estos assets, o una relación directa.
            //     // Esta parte requeriría que los PromptAssetVersions ya existan para esos assets comunes
            //     // y que tengas una forma de identificarlos (ej. por tag 'v1.0.0' y assetId).
            //     console.warn(`INFO: Prompt ${promptSeed.name} uses common assets: ${promptSeed.assetKeys.join(', ')}. Ensure versions are linked if required by schema.`);
            // }
        }
    }

    // Crear traducciones en español
    await createSpanishTranslations(mktProjectId);

    console.log('Marketing Content seeding finished.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });