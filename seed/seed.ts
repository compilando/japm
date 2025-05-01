import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para convertir a slug (simplificado, puedes usar una librería si necesitas más robustez)
const toSlug = (str: string) => {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-') // Reemplaza espacios con guiones
        .replace(/[^a-z0-9-]/g, '') // Elimina caracteres no alfanuméricos excepto guiones
        .replace(/--+/g, '-') // Reemplaza múltiples guiones con uno solo
        .replace(/^-+|-+$/g, ''); // Elimina guiones al inicio/final
};

async function main() {
    console.log(`Start seeding ...`);

    // --- Limpieza Opcional ---
    console.log('Deleting existing data...');
    await prisma.conversationPromptAssetLink.deleteMany({});
    await prisma.promptTranslation.deleteMany({});
    await prisma.assetTranslation.deleteMany({});
    await prisma.conversationPromptVersion.deleteMany({});
    await prisma.conversationPromptAssetVersion.deleteMany({});
    await prisma.conversationPrompt.deleteMany({});
    await prisma.conversationPromptAsset.deleteMany({});
    await prisma.conversationTactic.deleteMany({});
    await prisma.culturalData.deleteMany({});
    await prisma.region.deleteMany({});
    await prisma.tag.deleteMany({}); // Añadir limpieza de Tags
    console.log('Existing data deleted.');

    // 1. Crear Región ES
    console.log('Creating Region ES...');
    const regionES = await prisma.region.create({
        data: {
            name: 'España',
            languageCode: 'es-ES',
            timeZone: 'Europe/Madrid',
        },
    });
    console.log(`Created Region: ${regionES.name} (Language Code: ${regionES.languageCode})`);

    // 2. Crear CulturalData para ES
    console.log('Creating CulturalData ES...');
    // Paso 2.1: Crear CulturalData sin include
    const createdCulturalDataES = await prisma.culturalData.create({
        data: {
            id: "direct-and-formal",
            formalityLevel: 5,
            style: 'Directo pero formal',
            regionId: regionES.languageCode,
        },
    });
    // Paso 2.2: Leer de nuevo con include si es necesario
    const culturalDataES = await prisma.culturalData.findUniqueOrThrow({
        where: { id: createdCulturalDataES.id },
        include: { region: true }
    });
    console.log(`Created CulturalData for ES (ID: ${culturalDataES.id}, RegionID: ${culturalDataES.regionId})`);

    // 3. Crear Región US
    console.log('Creating Region US...');
    const regionUS = await prisma.region.create({
        data: { name: 'United States', languageCode: 'en-US', timeZone: 'America/New_York' },
    });
    console.log('Creating CulturalData US...');
    // Crear US Cultural Data (no necesitamos incluir region aquí para el resto del script)
    await prisma.culturalData.create({
        data: {
            id: regionUS.languageCode,
            formalityLevel: 3,
            style: 'Informal and direct',
            regionId: regionUS.languageCode,
        },
    });
    // Usar el regionId directamente que ya conocemos
    console.log(`Created CulturalData for US (ID: ${regionUS.languageCode}, RegionID: ${regionUS.languageCode})`);

    // 4. Crear Táctica (con nombre slug)
    const tacticName = 'Formal Greeting ES';
    const tacticSlug = toSlug(tacticName);
    console.log(`Creating Tactic '${tacticSlug}' ...`);
    const tacticFormalES = await prisma.conversationTactic.create({
        data: {
            name: tacticSlug,
            regionId: regionES.languageCode,
            culturalDataId: culturalDataES.id
        },
    });
    console.log(`Created Tactic: ${tacticFormalES.name}`);

    // 5. Crear Asset Lógico: Saludo (con key slug)
    const assetName = 'Saludo inicial';
    const assetKey = toSlug(assetName);
    console.log(`Creating Asset '${assetKey}' ...`);
    const assetSaludo = await prisma.conversationPromptAsset.create({
        data: {
            key: assetKey,
            name: assetName,
            description: 'Placeholder para el saludo inicial.',
            type: 'Greeting',
        },
    });
    console.log(`Created Asset: ${assetSaludo.key}`);

    // 6. Crear Versión 1.0.0 del Asset Saludo
    console.log(`Creating Asset Version ${assetKey} v1.0.0...`);
    const assetSaludoV1 = await prisma.conversationPromptAssetVersion.create({
        data: {
            value: 'Hello',
            versionTag: 'v1.0.0',
            changeMessage: 'Initial version',
            asset: { connect: { key: assetSaludo.key } },
        }
    });
    console.log(`Created Asset Version: ${assetSaludo.key} ${assetSaludoV1.versionTag} (ID: ${assetSaludoV1.id})`);

    // 7. Crear Traducción ES para Asset Saludo v1.0.0
    console.log('Creating Asset Translation ES Saludo v1.0.0...');
    await prisma.assetTranslation.create({
        data: {
            languageCode: 'es-ES',
            value: 'Hola',
            version: { connect: { id: assetSaludoV1.id } },
        }
    });
    console.log(`Created Asset Translation ES for ${assetSaludo.key} ${assetSaludoV1.versionTag}`);

    // 8. Marcar v1.0.0 como activa para el Asset Saludo
    console.log('Setting Active Version for Asset Saludo...');
    await prisma.conversationPromptAsset.update({
        where: { key: assetSaludo.key },
        data: { activeVersion: { connect: { id: assetSaludoV1.id } } },
    });
    console.log(`Set active version for Asset: ${assetSaludo.key}`);

    // 9. Crear Prompt Lógico: Bienvenida Simple (con name slug y tags slugs)
    const promptName = 'Bienvenida Simple';
    const promptSlug = toSlug(promptName);
    const tagNames = ['bienvenida', 'general']; // Tags ya en formato slug
    console.log(`Creating Prompt '${promptSlug}' ...`);
    const promptBienvenida = await prisma.conversationPrompt.create({
        data: {
            name: promptSlug,
            description: 'Un prompt simple de bienvenida usando un asset.',
            tactic: { connect: { name: tacticFormalES.name } },
            tags: {
                connectOrCreate: tagNames.map(tagName => ({
                    where: { name: tagName },
                    create: { name: tagName },
                }))
            }
        },
        include: { tags: true }
    });
    console.log(`Created Prompt: ${promptBienvenida.name} with tags: ${promptBienvenida.tags.map(t => t.name).join(', ')}`);

    // 10. Crear Versión 1.0.0 del Prompt Bienvenida
    console.log(`Creating Prompt Version ${promptSlug} v1.0.0...`);
    const promptBienvenidaV1 = await prisma.conversationPromptVersion.create({
        data: {
            promptText: `{{${assetSaludo.key}}}, how can I help you today?`,
            versionTag: 'v1.0.0',
            changeMessage: 'Initial version using greeting asset',
            prompt: { connect: { name: promptBienvenida.name } },
        }
    });
    console.log(`Created Prompt Version: ${promptBienvenida.name} ${promptBienvenidaV1.versionTag} (ID: ${promptBienvenidaV1.id})`);

    // 11. Crear Traducción ES para Prompt Bienvenida v1.0.0
    console.log(`Creating Prompt Translation ES for ${promptBienvenida.name} ${promptBienvenidaV1.versionTag}...`);
    await prisma.promptTranslation.create({
        data: {
            languageCode: 'es-ES',
            promptText: `{{${assetSaludo.key}}}, ¿en qué puedo ayudarte hoy?`,
            version: { connect: { id: promptBienvenidaV1.id } },
        }
    });
    console.log(`Created Prompt Translation ES for ${promptBienvenida.name} ${promptBienvenidaV1.versionTag}`);

    // 12. Vincular Asset Saludo v1.0.0 al Prompt Bienvenida v1.0.0
    console.log('Linking Asset Version to Prompt Version...');
    await prisma.conversationPromptAssetLink.create({
        data: {
            position: 1,
            usageContext: 'Inicio del prompt',
            promptVersion: { connect: { id: promptBienvenidaV1.id } },
            assetVersion: { connect: { id: assetSaludoV1.id } },
        }
    });
    console.log(`Linked Asset ${assetSaludo.key} v${assetSaludoV1.versionTag} to Prompt ${promptBienvenida.name} v${promptBienvenidaV1.versionTag}`);

    // 13. Marcar v1.0.0 como activa para el Prompt Bienvenida
    console.log('Setting Active Version for Prompt Bienvenida...');
    await prisma.conversationPrompt.update({
        where: { name: promptBienvenida.name },
        data: { activeVersion: { connect: { id: promptBienvenidaV1.id } } },
    });
    console.log(`Set active version for Prompt: ${promptBienvenida.name}`);

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 