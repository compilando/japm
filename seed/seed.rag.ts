import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

// Traducciones específicas para el proyecto RAG
const ragTranslations = {
    assets: {
        'rag-instructions': `**Flujo de Trabajo Central del Sistema RAG y Directrices Operativas:**\n\n        **Fase 1: Ingesta y Preparación de Documentos**\n        1.  **Adquisición Segura de Documentos:** Obtener documento(s) de la fuente especificada (ej., carga de archivos, bucket S3, endpoint API).\n        2.  **Validación y Sanitización de Formato:** Verificar formatos admitidos (PDF, DOCX, TXT, MD). Sanitizar contenido para prevenir problemas de inyección o análisis.\n        3.  **Extracción de Texto y Fragmentación (Chunking):** Extraer con precisión todo el contenido textual. Segmentar estratégicamente documentos grandes en fragmentos más pequeños y semánticamente coherentes (ej., por párrafo, sección o tamaño fijo con superposición) optimizados para la incrustación.\n        4.  **Enriquecimiento de Metadatos:** Extraer o asociar metadatos relevantes (ej., título del documento, fuente, fecha de creación, autor, palabras clave, permisos de acceso).\n\n        **Fase 2: Incrustación e Indexación**\n        5.  **Generación de Incrustaciones (Embeddings):** Para cada fragmento de texto, generar incrustaciones vectoriales de alta calidad utilizando el modelo designado (ej., {{embedding_model_name}}).\n        6.  **Almacenamiento e Indexación Vectorial:** Almacenar fragmentos de texto, sus incrustaciones y metadatos asociados en la base de datos vectorial (ej., {{vector_db_name}}). Asegurar una indexación eficiente para una búsqueda semántica rápida.\n\n        **Fase 3: Recuperación y Aumentación**\n        7.  **Procesamiento de Consultas:** Recibir consulta del usuario. Preprocesar la consulta si es necesario (ej., limpieza, extracción de palabras clave).\n        8.  **Ejecución de Búsqueda Semántica:** Convertir la consulta del usuario en una incrustación y realizar una búsqueda de similitud contra la base de datos vectorial para recuperar los K fragmentos de texto más relevantes.\n        9.  **Aumentación Contextual:** Compilar los fragmentos recuperados para formar una base contextual rica para la generación de respuestas.\n\n        **Fase 4: Generación de Respuestas (manejada usualmente por un prompt de QA separado)**\n        10. **Síntesis de Respuestas:** (Típicamente) Pasar la consulta original del usuario y el contexto recuperado a un Modelo de Lenguaje Grande para generar una respuesta concisa, precisa y contextualmente fundamentada.\n\n        *Mantener registros de cada paso para trazabilidad y análisis de errores.*`,
        'rag-validation-rules': `**Criterios de Validación de Documentos y Procesos RAG:**\n\n        **A. Validación de Ingesta de Documentos:**\n        1.  **Cumplimiento de Formato:** El documento debe ser uno de: PDF, DOCX, TXT, MD. Rechazar otros.\n        2.  **Limitación de Tamaño:** El tamaño del documento no debe exceder los {{max_document_size_mb}} MB.\n        3.  **Integridad del Contenido:**\n            *   Realizar un escaneo básico de virus si es posible.\n            *   Comprobar si hay contenido sin sentido excesivo o no extraíble.\n            *   Asegurar que la extracción de texto produzca un recuento mínimo de caracteres (ej., > {{min_char_count_per_doc}}).\n        4.  **Completitud de Metadatos (Requeridos):**\n            *   \`source_uri\`: Debe estar presente y ser un URI/ruta válida.\n            *   \`document_id\`: Debe estar presente y ser único (generado por el sistema o proporcionado).\n            *   \`title\`: Debe estar presente si no se puede derivar del nombre del archivo.\n        5.  **Completitud de Metadatos (Opcional pero Recomendado):**\n            *   \`author\`, \`creation_date\`, \`keywords_list\`, \`access_tier\`.\n\n        **B. Validación de Incrustación e Indexación:**\n        6.  **Eficacia de la Fragmentación (Chunking):** El número de fragmentos debe ser razonable (ej., no excesivamente fragmentado, ni muy pocos para documentos grandes).\n        7.  **Éxito en la Generación de Incrustaciones:** Cada fragmento debe generar con éxito un vector de incrustación válido (dimensionalidad correcta, no nulo).\n        8.  **Confirmación de Escritura en BD Vectorial:** Acuse de recibo de escritura exitosa de {{vector_db_name}} para cada fragmento y sus metadatos.\n        9.  **Consistencia del Índice (Post-Actualización):** Realizar una consulta de muestra relacionada con el nuevo contenido para asegurar que es recuperable.\n\n        **C. Validación de Consultas y Recuperación (Operacional):**\n        10. **Buena Formación de la Consulta:** La consulta no debe estar vacía ni ser excesivamente larga (ej., < {{max_query_length_chars}}).\n        11. **Cordura de la Recuperación:** Se debe recuperar al menos un fragmento relevante para consultas bien planteadas sobre contenido indexado. Ningún resultado debe ser marcado si el corpus está vacío.`,
        'rag-error-messages': `**Mensajes de Error Estandarizados del Sistema RAG:**\n\n        *   **Ingesta de Documentos:**\n            *   \`E1001: Formato de documento no admitido para '{doc_name}'. Admitidos: PDF, DOCX, TXT, MD.\`\n            *   \`E1002: El documento '{doc_name}' (tamaño: {doc_size_mb}MB) excede el tamaño máximo permitido de {max_doc_size_mb}MB.\`\n            *   \`E1003: Se detectó contenido potencialmente malicioso en '{doc_name}'. Ingesta abortada.\`\n            *   \`E1004: La extracción de texto falló o produjo contenido insuficiente de '{doc_name}'. Mín. caracteres: {min_char_count_per_doc}.\`\n            *   \`E1005: Falta el campo de metadatos requerido '{field_name}' para el documento '{doc_name}'.\`\n            *   \`E1006: URI/ruta inválida para 'source_uri': '{uri_value}' para el documento '{doc_name}'.\`\n        *   **Incrustación e Indexación:**\n            *   \`E2001: Falló la generación de incrustaciones para el fragmento {chunk_id} del documento '{doc_name}'. Modelo: {embedding_model_name}. Error: {specific_error}.\`\n            *   \`E2002: Falló la escritura del fragmento {chunk_id} (doc: '{doc_name}') en la base de datos vectorial '{vector_db_name}'. Error: {db_error}.\`\n            *   \`E2003: Falló la verificación de consistencia del índice después de la actualización para contenido relacionado con '{doc_name}'.\`\n        *   **Consultas y Recuperación:**\n            *   \`E3001: La consulta está vacía o excede la longitud máxima de {max_query_length_chars} caracteres.\`\n            *   \`E3002: Falló la búsqueda semántica. Error de consulta en BD vectorial '{vector_db_name}': {db_error}.\`\n            *   \`W3001: No se encontraron documentos relevantes para la consulta. El corpus podría estar vacío o la consulta ser demasiado específica.\`\n        *   **General:**\n            *   \`E9001: Ocurrió un error inesperado del sistema. ID de Ref: {trace_id}. Detalles: {error_details}\``
    },
    prompts: {
        'process-document': `Procesar exhaustivamente el siguiente documento para su ingesta en el sistema RAG:\n\n        Referencia del Documento: {{document_path_or_id}}\n        Contenido del Documento (o puntero al mismo):\n        \`\`\`\n        {{document_content_or_pointer}}\n        \`\`\`\n\n        Pasos Detallados del Proceso de Ingesta (seguir {{rag-instructions}} como guía general):\n        1.  **Validación Rigurosa:** Aplicar todas las reglas de {{rag-validation-rules}} (Sección A: Document Ingestion). Registrar cualquier fallo.\n        2.  **Extracción y Segmentación de Texto:** Extraer texto con alta fidelidad. Segmentar en trozos semánticamente significativos (aprox. {{chunk_size_tokens}} tokens con {{chunk_overlap_tokens}} tokens de superposición).\n        3.  **Generación de Incrustaciones:** Para cada trozo, generar incrustaciones usando el modelo {{embedding_model_name}}.\n        4.  **Almacenamiento de Metadatos:** Registrar metadatos completos (fuente, título, fecha, {{additional_metadata_fields}}).\n        5.  **Indexación en BD Vectorial:** Almacenar trozos, incrustaciones y metadatos en {{vector_db_name}}. Confirmar la escritura.\n\n        Manejo de Errores:\n        Registrar todos los errores usando los códigos de {{rag-error-messages}}. Si ocurre un error crítico (ej., formato no soportado, fallo de extracción severo), abortar el proceso para este documento y notificar.`,
        'search-documents': `Realizar una búsqueda semántica avanzada en la base de conocimiento documental (RAG).\n\n        Consulta del Usuario:\n        "{{query}}"\n\n        Criterios de Búsqueda y Recuperación:\n        1.  **Relevancia Semántica Primaria:** Utilizar similitud de cosenos entre la incrustación de la consulta y las incrustaciones de los fragmentos de documento.\n        2.  **Filtrado por Metadatos (si se proporcionan):**\n            *   \`source_filter\`: {{source_filter_value_or_null}}\n            *   \`date_range_filter\`: de {{start_date_or_null}} a {{end_date_or_null}}\n            *   \`keyword_filter_list\`: {{list_of_keywords_or_null}}\n            *   \`access_tier_filter\`: {{user_access_tier_or_null}}\n        3.  **Ranking y Puntuación:** Ordenar los resultados por puntuación de similitud descendente. Aplicar un umbral mínimo de similitud de {{min_similarity_score}}.\n        4.  **Límite de Resultados:** Devolver un máximo de {{top_k_results}} fragmentos de documentos.\n        5.  **Diversificación (Opcional):** Si se solicita, intentar diversificar los resultados para evitar redundancia excesiva de la misma fuente si las puntuaciones son similares.\n\n        Salida Esperada:\n        Una lista ordenada de los fragmentos de documento más relevantes, cada uno incluyendo:\n        - \`document_id\`\n        - \`chunk_id\`\n        - \`text_content\` (el fragmento recuperado)\n        - \`source_uri\`\n        - \`title\`\n        - \`similarity_score\`\n        - (Otros metadatos relevantes como \`author\`, \`creation_date\`)\n\n        Considerar el contexto de {{user_profile_summary_or_null}} para refinar potencialmente la interpretación de la consulta o el ranking, si es aplicable.`,
        'update-index': `Actualizar el índice de la base de datos vectorial RAG con los siguientes cambios en los documentos.\n\n        Documentos Afectados y Acciones:\n        \`\`\`json\n        {{documents_and_actions_json}}\n        \`\`\`\n        (Ejemplo de JSON: \`[ { "action": "add/update", "document_id": "doc123", "new_content_path": "/path/to/new_doc123.pdf", "new_metadata": {...} }, { "action": "delete", "document_id": "doc456" } ]\`)\n\n        Procedimiento de Actualización Detallado (seguir {{rag-instructions}} como guía):\n        1.  **Verificación de Cambios:** Para cada documento, validar la acción solicitada y los datos proporcionados.\n        2.  **Procesamiento para 'add/update':**\n            *   Aplicar el flujo completo de ingesta (validación, extracción, segmentación, incrustación) para el nuevo contenido.\n            *   Actualizar/sobrescribir los fragmentos, incrustaciones y metadatos existentes para el \`document_id\` en {{vector_db_name}}.\n        3.  **Procesamiento para 'delete':**\n            *   Eliminar todos los fragmentos, incrustaciones y metadatos asociados con el \`document_id\` de {{vector_db_name}}.\n        4.  **Reindexación Parcial (si aplica):** Desencadenar cualquier proceso de reindexación necesario en {{vector_db_name}} para reflejar los cambios.\n        5.  **Validación de Consistencia:**\n            *   Para 'add/update', confirmar que el nuevo contenido es recuperable mediante una consulta de prueba.\n            *   Para 'delete', confirmar que el contenido eliminado ya no es recuperable.\n            *   Ejecutar pruebas de integridad del índice según {{rag-validation-rules}} (Sección B y C si es posible).\n\n        Asegurar la integridad y atomicidad de las actualizaciones del índice. Registrar todas las operaciones y errores (usando {{rag-error-messages}}).`
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
            prompt: { select: { id: true } }, // Incluir el id del prompt para buscar en ragTranslations
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
        const translation = ragTranslations.prompts[version.prompt.id] || version.promptText;
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
        const translation = ragTranslations.assets[version.asset.key] || version.value;
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
    console.log(`Start seeding for Internal Knowledge Base (RAG)...`);
    console.log('Assuming prior cleanup...');

    const defaultLanguageCode = process.env.DEFAULT_LANGUAGE_CODE || 'en-US';
    console.log(`Using default language code: ${defaultLanguageCode}`);

    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });
    // Find necessary base data
    // const defaultProjectId = 'default-project'; // Assuming the default project ID
    // const stagingEnvironment = await prisma.environment.findUniqueOrThrow({
    //     where: { projectId_name: { name: 'staging', projectId: defaultProjectId } }, // Find env in default project
    //     select: { id: true } // Select ID for connecting later
    // });
    // const productionEnvironment = await prisma.environment.findUniqueOrThrow({
    //     where: { projectId_name: { name: 'production', projectId: defaultProjectId } }, // Find env in default project
    //     select: { id: true } // Select ID for connecting later
    // });

    // --- RAG Project ---
    const ragProject = await prisma.project.upsert({
        where: { id: 'internal-hr-assistant' },
        update: { name: 'Internal HR Policy Assistant', description: 'AI assistant to answer employee questions based on HR documents.', ownerUserId: testUser.id },
        create: {
            id: 'internal-hr-assistant',
            name: 'Internal HR Policy Assistant',
            description: 'AI assistant to answer employee questions based on HR documents.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: defaultTenant.id } }
        },
    });
    console.log(`Upserted Project: ${ragProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto RAG
    await createSpanishRegionAndCulturalData(ragProject.id);
    // Crear región en-US y datos culturales para el proyecto RAG
    await createUSRegionAndCulturalData(ragProject.id);

    // Create specific AI models for this project
    const ragProjectId = ragProject.id;

    // Crear Environments para el proyecto RAG
    const ragDevEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: ragProjectId } },
        update: {},
        create: { name: 'development', projectId: ragProjectId, description: 'Development environment for RAG project' },
        select: { id: true }
    });
    const ragStagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: ragProjectId } },
        update: {},
        create: { name: 'staging', projectId: ragProjectId, description: 'Staging environment for RAG project' },
        select: { id: true }
    });
    const ragProdEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: ragProjectId } },
        update: {},
        create: { name: 'production', projectId: ragProjectId, description: 'Production environment for RAG project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${ragProjectId}`);

    const ragGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: ragProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: ragProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const ragGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: ragProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: ragProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${ragProjectId}`);

    // --- Upsert RAG Tags with prefix ---
    const ragPrefix = 'rag_';
    const ragBaseTags = ['rag', 'internal-kb', 'hr-policy', 'employee-faq', 'compliance'];
    const ragTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of ragBaseTags) {
        const tagName = `${ragPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: ragProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: ragProjectId },
            select: { id: true }
        });
        ragTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${ragProjectId}`);
    }
    // Helper function to get tag IDs
    const getRagTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => ragTagMap.get(`${ragPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // --- Upsert RAG Document Metadata ---
    // Using individual upserts for idempotency
    const metadataToUpsert = [
        { id: 'doc-handbook-v4-2', documentName: 'Employee Handbook v4.2', category: 'HR Policy', complianceReviewed: true, piiRiskLevel: 'Medium', lastReviewedBy: 'HR Compliance Team', projectId: ragProjectId },
        { id: 'doc-remote-policy-2024', documentName: 'Remote Work Policy 2024', category: 'HR Policy', complianceReviewed: true, piiRiskLevel: 'Low', lastReviewedBy: 'HR Compliance Team', projectId: ragProjectId },
        { id: 'doc-benefits-2025', documentName: 'Benefits Guide 2025', category: 'Benefits', complianceReviewed: true, piiRiskLevel: 'High', lastReviewedBy: 'Benefits Team', projectId: ragProjectId },
        { id: 'doc-it-sec-guide', documentName: 'IT Security Guidelines', category: 'IT Policy', complianceReviewed: false, piiRiskLevel: 'Low', lastReviewedBy: 'IT Security', projectId: ragProjectId },
    ];

    for (const meta of metadataToUpsert) {
        await prisma.ragDocumentMetadata.upsert({
            where: { id: meta.id }, // Use provided ID for where clause
            update: { ...meta, projectId: undefined }, // Update all fields except projectId and id
            create: meta, // Create with all fields
        });
    }
    console.log('Upserted RAG Document Metadata entries.');

    // --- Upsert RAG Prompt: Answer Question ---
    const promptRagQueryName = 'answer-hr-question-rag';
    const promptRagQuerySlug = slugify(promptRagQueryName); // ID
    const promptRagQuery = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: { // Usar nombre correcto
                id: promptRagQuerySlug,
                projectId: ragProjectId
            }
        },
        update: {
            name: promptRagQueryName,
            description: 'Core RAG prompt to answer user questions based on retrieved context.',
            tags: { set: getRagTagIds(['rag', 'hr-policy', 'employee-faq']) }
        },
        create: {
            id: promptRagQuerySlug, // ID es slug
            name: promptRagQueryName,
            description: 'Core RAG prompt to answer user questions based on retrieved context.',
            projectId: ragProjectId,
            tags: { connect: getRagTagIds(['rag', 'hr-policy', 'employee-faq']) }
        },
        select: { id: true, name: true }
    });
    console.log(`Upserted Prompt ${promptRagQuery.name} (ID: ${promptRagQuery.id})`);

    // --- Upsert RAG Assets (ahora bajo el prompt 'answer-hr-question-rag') ---
    const ragInstructionsName = 'RAG System General Instructions';
    const assetRagInstructions = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: promptRagQuery.id, // MODIFICADO
                projectId: ragProjectId,
                key: 'rag-instructions'
            }
        },
        update: {},
        create: {
            key: 'rag-instructions',
            promptId: promptRagQuery.id, // MODIFICADO
            projectId: ragProjectId
        }
    });
    const assetRagInstructionsV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetRagInstructions.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.',
            status: 'active',
            changeMessage: ragInstructionsName
        },
        create: {
            assetId: assetRagInstructions.id,
            value: 'You are an AI assistant helping employees answer questions based ONLY on the provided internal documents. Answer concisely and accurately using the information given in the context. Cite the source document name(s) for your answer. If the answer cannot be found in the provided context, state that clearly. Do not make assumptions or use external knowledge.',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: ragInstructionsName
        },
        select: { id: true }
    });

    const citationFormatAssetName = 'RAG Citation Format';
    const assetCitationFormat = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: promptRagQuery.id, // MODIFICADO
                projectId: ragProjectId,
                key: 'rag-citation-format'
            }
        },
        update: {},
        create: {
            key: 'rag-citation-format',
            promptId: promptRagQuery.id, // MODIFICADO
            projectId: ragProjectId
        }
    });
    const assetCitationFormatV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetCitationFormat.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Cite sources like this: (Source: [Document Name])',
            status: 'active',
            changeMessage: citationFormatAssetName
        },
        create: {
            assetId: assetCitationFormat.id,
            value: 'Cite sources like this: (Source: [Document Name])',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: citationFormatAssetName
        },
        select: { id: true }
    });

    const notFoundResponseAssetName = 'RAG Not Found Response';
    const assetNotFoundResponse = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: promptRagQuery.id, // MODIFICADO
                projectId: ragProjectId,
                key: 'rag-not-found-response'
            }
        },
        update: {},
        create: {
            key: 'rag-not-found-response',
            promptId: promptRagQuery.id, // MODIFICADO
            projectId: ragProjectId
        }
    });
    const assetNotFoundResponseV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetNotFoundResponse.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'I could not find information about that in the provided documents.',
            status: 'active',
            changeMessage: notFoundResponseAssetName
        },
        create: {
            assetId: assetNotFoundResponse.id,
            value: 'I could not find information about that in the provided documents.',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: notFoundResponseAssetName
        },
        select: { id: true }
    });
    console.log('Upserted RAG Assets and V1 Versions for answer-hr-question-rag prompt');

    // --- Upsert RAG Prompt: Answer Question (VERSION) ---
    // const promptRagQueryName = 'answer-hr-question-rag'; // Ya definido y creado arriba
    // const promptRagQuerySlug = slugify(promptRagQueryName); 
    // const promptRagQuery = await prisma.prompt.upsert({ ... }); // Ya definido y creado arriba

    // This prompt takes the user's question and the retrieved context as input at runtime.
    const promptRagQueryV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptRagQuery.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `{{rag-instructions}}

            Context Documents:
            --- START CONTEXT ---
            {{Retrieved Context Chunks}}
            --- END CONTEXT ---

            User Question: {{User Question}}

            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.

            Answer:`, // CORREGIDO placeholder
            status: 'active',
            activeInEnvironments: { set: [{ id: ragProdEnv.id }, { id: ragStagingEnv.id }] },
            aiModelId: ragGpt4o.id,
            languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
        },
        create: {
            promptId: promptRagQuery.id,
            promptText: `{{rag-instructions}}

            Context Documents:
            --- START CONTEXT ---
            {{Retrieved Context Chunks}}
            --- END CONTEXT ---

            User Question: {{User Question}}

            Answer based ONLY on the context above. Use this citation format: {{rag-citation-format}}. If the answer isn't in the context, respond with: {{rag-not-found-response}}.

            Answer:`, // CORREGIDO placeholder
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: 'Initial RAG prompt using system instructions and context.',
            activeInEnvironments: { connect: [{ id: ragProdEnv.id }, { id: ragStagingEnv.id }] },
            aiModelId: ragGpt4o.id,
            languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
        },
        select: { id: true, languageCode: true } // Asegurar que se selecciona languageCode
    });
    console.log(`Upserted PromptVersion for ${promptRagQuery.name} V1 (Lang: ${promptRagQueryV1.languageCode})`);

    // Crear traducciones es-ES para los assets y prompts
    await createSpanishTranslations(ragProjectId);

    console.log(`RAG & Document Q&A seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });