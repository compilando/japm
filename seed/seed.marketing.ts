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

    // Obtener todas las promptversion y promptassetversion del proyecto
    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        include: {
            prompt: true
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
        const translation = marketingTranslations.prompts[version.prompt.id] || version.promptText;
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

    // --- Upsert Marketing Assets --- 
    const audienceAssetName = 'Target Audience Persona';
    const assetAudience = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: mktCommonAssetsPrompt.id,
                projectId: marketingProject.id,
                key: 'target-audience-persona'
            }
        },
        update: {},
        create: {
            key: 'target-audience-persona',
            promptId: mktCommonAssetsPrompt.id,
            projectId: marketingProject.id
        }
    });
    const assetAudienceV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetAudience.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]`,
            status: 'active',
            changeMessage: audienceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetAudience.id,
            value: `Describe the target audience:\n- Demographics: [Age, Location, Income]\n- Interests: [Hobbies, Media Consumption]\n- Pain Points: [Challenges, Needs]`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: audienceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        select: { id: true }
    });
    console.log(`Upserted AssetVersion ${assetAudience.key} v1.0.0 with Marketplace Status: PENDING_APPROVAL`);

    const brandVoiceAssetName = 'Brand Voice Guidelines - Eco-Friendly';
    const assetBrandVoice = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: mktCommonAssetsPrompt.id,
                projectId: marketingProject.id,
                key: 'brand-voice-eco-friendly'
            }
        },
        update: {},
        create: {
            key: 'brand-voice-eco-friendly',
            promptId: mktCommonAssetsPrompt.id,
            projectId: marketingProject.id
        }
    });
    const assetBrandVoiceV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetBrandVoice.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Comunicación auténtica y transparente. Enfócate en la sostenibilidad y el impacto ambiental. Usa un tono optimista pero realista. Evita el greenwashing y las exageraciones.`,
            status: 'active',
            changeMessage: brandVoiceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(), // Simulate approval
            marketplaceApproverId: testUser.id, // Simulate self-approval or admin
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetBrandVoice.id,
            value: `Comunicación auténtica y transparente. Enfócate en la sostenibilidad y el impacto ambiental. Usa un tono optimista pero realista. Evita el greenwashing y las exageraciones.`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: brandVoiceAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(), // Simulate approval
            marketplaceApproverId: testUser.id, // Simulate self-approval or admin
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted AssetVersion ${assetBrandVoice.key} v1.0.0 with Marketplace Status: PUBLISHED`);

    const smToneAssetName = 'Social Media Tone & CTAs'; // Nombre corregido/aclarado
    const assetSMTone = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: mktCommonAssetsPrompt.id,
                projectId: marketingProject.id,
                key: 'social-media-tone'
            }
        },
        update: {},
        create: {
            key: 'social-media-tone',
            promptId: mktCommonAssetsPrompt.id,
            projectId: marketingProject.id
        }
    });
    const assetSMToneV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetSMTone.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Learn More\nShop Now\nSign Up Today\nDownload Free Guide`,
            status: 'active',
            changeMessage: smToneAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetSMTone.id,
            value: `Learn More\nShop Now\nSign Up Today\nDownload Free Guide`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: smToneAssetName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted AssetVersion ${assetSMTone.key} v1.0.0 with Marketplace Status: NOT_PUBLISHED`);

    const ctaListName = 'Common Call-to-Actions (CTA) List';
    const assetCtaList = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: mktCommonAssetsPrompt.id,
                projectId: marketingProject.id,
                key: 'common-cta-list'
            }
        },
        update: {},
        create: {
            key: 'common-cta-list',
            promptId: mktCommonAssetsPrompt.id,
            projectId: marketingProject.id
        }
    });
    const assetCtaListV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetCtaList.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `List of common call-to-actions for marketing purposes.`,
            status: 'active',
            changeMessage: ctaListName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetCtaList.id,
            value: `List of common call-to-actions for marketing purposes.`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: ctaListName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        select: { id: true }
    });
    console.log(`Upserted AssetVersion ${assetCtaList.key} v1.0.0 with Marketplace Status: PUBLISHED`);

    const productDescriptionName = 'Product Description Template - Standard Product';
    const assetProductDescription = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: mktCommonAssetsPrompt.id,
                projectId: marketingProject.id,
                key: 'product-description-template'
            }
        },
        update: {},
        create: {
            key: 'product-description-template',
            promptId: mktCommonAssetsPrompt.id,
            projectId: marketingProject.id
        }
    });
    const assetProductDescriptionV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetProductDescription.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `This is a standard product description template.`,
            status: 'active',
            changeMessage: productDescriptionName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        create: {
            assetId: assetProductDescription.id,
            value: `This is a standard product description template.`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: productDescriptionName,
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        select: { id: true }
    });
    console.log(`Upserted AssetVersion ${assetProductDescription.key} v1.0.0 with Marketplace Status: PUBLISHED`);

    // --- Upsert Marketing Prompt: Generate Blog Post Idea --- 
    const promptBlogPostIdeaName = 'generate-blog-post-idea';
    const promptBlogPostIdeaSlug = slugify(promptBlogPostIdeaName);
    const promptBlogPostIdea = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: promptBlogPostIdeaSlug,
                projectId: marketingProject.id
            }
        },
        update: {
            name: promptBlogPostIdeaName,
            description: 'Generate blog post ideas for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'blog-post']) }
        },
        create: {
            id: promptBlogPostIdeaSlug,
            name: promptBlogPostIdeaName,
            description: 'Generate blog post ideas for a target audience.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'blog-post']) }
        },
        select: { id: true, name: true }
    });

    const promptBlogPostIdeaV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptBlogPostIdea.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: mktDevEnv.id }] },
            aiModelId: mktGpt4o.id // Assign default AI model
        },
        create: {
            promptId: promptBlogPostIdea.id,
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating blog post ideas.',
            activeInEnvironments: { connect: [{ id: mktDevEnv.id }] },
            aiModelId: mktGpt4o.id // Assign default AI model
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptBlogPostIdea.name} V1`);

    // --- Upsert Marketing Prompt: Generate Social Media Post --- 
    const socialPostName = 'Generate Social Media Post';
    const promptSocialPost = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: slugify(socialPostName),
                projectId: marketingProject.id
            }
        },
        update: {
            name: socialPostName,
            description: 'Generate social media posts for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'social-media']) }
        },
        create: {
            id: slugify(socialPostName),
            name: socialPostName,
            description: 'Generate social media posts for a target audience.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'social-media']) }
        },
        select: { id: true, name: true }
    });

    const promptSocialPostV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptSocialPost.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            aiModelId: mktGpt4oMini.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for social media post generation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            promptId: promptSocialPost.id,
            versionTag: 'v1.0.0',
            promptText: `Generate 5 blog post ideas relevant to the following target audience:\n{{target-audience-persona}}\n\nFocus on topics related to: {{Topic Focus}}\n\nEnsure the ideas are engaging and SEO-friendly.`,
            aiModelId: mktGpt4oMini.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for social media post generation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PENDING_APPROVAL,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted PromptVersion ${promptSocialPost.id} v1.0.0 with Marketplace Status: PENDING_APPROVAL`);

    // --- Upsert Marketing Prompt: Create Email Campaign --- 
    const emailCampaignName = 'Create Email Campaign';
    const promptEmailCampaign = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: slugify(emailCampaignName),
                projectId: marketingProject.id
            }
        },
        update: {
            name: emailCampaignName,
            description: 'Create an email marketing campaign for a target audience.',
            tags: { set: getMktTagIds(['marketing', 'email-campaign']) }
        },
        create: {
            id: slugify(emailCampaignName),
            name: emailCampaignName,
            description: 'Create an email marketing campaign for a target audience.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'email-campaign']) }
        },
        select: { id: true, name: true }
    });

    const promptEmailCampaignV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptEmailCampaign.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Create an email marketing campaign with the following characteristics:\n\nAudience: {audience}\nObjective: {objective}\nTopic: {topic}\n\nThe campaign should include:\n- Email subject\n- Subject line\n- Email body\n- Call to action\n- Suggested segmentation\n\nOptimize for engagement and conversion.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for email campaign creation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        },
        create: {
            promptId: promptEmailCampaign.id,
            versionTag: 'v1.0.0',
            promptText: `Create an email marketing campaign with the following characteristics:\n\nAudience: {audience}\nObjective: {objective}\nTopic: {topic}\n\nThe campaign should include:\n- Email subject\n- Subject line\n- Email body\n- Call to action\n- Suggested segmentation\n\nOptimize for engagement and conversion.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for email campaign creation',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.PUBLISHED,
            marketplaceRequestedAt: new Date(),
            marketplaceRequesterId: testUser.id,
            marketplaceApprovedAt: new Date(),
            marketplaceApproverId: testUser.id,
            marketplacePublishedAt: new Date(),
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted PromptVersion ${promptEmailCampaign.id} v1.0.0 with Marketplace Status: PUBLISHED`);

    // --- Upsert Marketing Prompt: Develop Brand Messaging --- 
    const brandMessagingName = 'Develop Brand Messaging';
    const promptBrandMessaging = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: slugify(brandMessagingName),
                projectId: marketingProject.id
            }
        },
        update: {
            name: brandMessagingName,
            description: 'Develop brand messages for a specific initiative.',
            tags: { set: getMktTagIds(['marketing', 'brand-messaging']) }
        },
        create: {
            id: slugify(brandMessagingName),
            name: brandMessagingName,
            description: 'Develop brand messages for a specific initiative.',
            projectId: marketingProject.id,
            tags: { connect: getMktTagIds(['marketing', 'brand-messaging']) }
        },
        select: { id: true, name: true }
    });

    const promptBrandMessagingV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptBrandMessaging.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Develop brand messages for the following initiative:\n\nInitiative: {initiative}\nAudience: {audience}\nChannel: {channel}\n\nThe messages should include:\n- Value proposition\n- Key benefits\n- Call to action\n- Tone of voice\n\nAlign with brand strategy.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for brand messaging development',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        },
        create: {
            promptId: promptBrandMessaging.id,
            versionTag: 'v1.0.0',
            promptText: `Develop brand messages for the following initiative:\n\nInitiative: {initiative}\nAudience: {audience}\nChannel: {channel}\n\nThe messages should include:\n- Value proposition\n- Key benefits\n- Call to action\n- Tone of voice\n\nAlign with brand strategy.`,
            aiModelId: mktGpt4o.id, // Corregido de modelId a aiModelId
            status: 'active',
            changeMessage: 'Initial version for brand messaging development',
            // Marketplace fields
            marketplaceStatus: MarketplacePublishStatus.NOT_PUBLISHED,
            marketplaceRequestedAt: null,
            marketplaceRequesterId: null,
            marketplacePublishedAt: null,
            marketplaceApprovedAt: null,
            marketplaceApproverId: null,
            marketplaceRejectionReason: null,
        }
    });
    console.log(`Upserted PromptVersion ${promptBrandMessaging.id} v1.0.0 with Marketplace Status: NOT_PUBLISHED`);

    // Crear traducciones es-ES para los assets y prompts
    await createSpanishTranslations(marketingProject.id);

    console.log(`Marketing & Content Creation seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });