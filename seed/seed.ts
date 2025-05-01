import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

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
    await prisma.promptAssetLink.deleteMany({});
    await prisma.promptTranslation.deleteMany({});
    await prisma.assetTranslation.deleteMany({});
    await prisma.promptVersion.deleteMany({});
    await prisma.promptAssetVersion.deleteMany({});
    await prisma.prompt.deleteMany({});
    await prisma.promptAsset.deleteMany({});
    await prisma.tactic.deleteMany({});
    await prisma.culturalData.deleteMany({});
    await prisma.region.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.environment.deleteMany({});
    await prisma.aIModel.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Existing data deleted.');

    // --- NUEVOS DATOS ---

    // 1. Crear Usuario de prueba
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: hashedPassword,
        },
    });
    console.log(`Created/Found user: ${testUser.email}`);

    // 2. Crear AI Models
    console.log('Creating AI Models...');
    const aiModelsData = [
        { name: 'gpt-4-turbo-2024-04-09', provider: 'OpenAI', apiIdentifier: 'gpt-4-turbo-2024-04-09', description: 'Latest GPT-4 Turbo model', contextWindow: 128000, supportsJson: true, maxTokens: 4096 },
        { name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiIdentifier: 'gpt-4o-2024-05-13', description: 'Latest omni model from OpenAI', contextWindow: 128000, supportsJson: true, maxTokens: 4096 },
        { name: 'claude-3-opus-20240229', provider: 'Anthropic', apiIdentifier: 'claude-3-opus-20240229', description: 'Most powerful Claude 3 model', contextWindow: 200000, supportsJson: true, maxTokens: 4096 },
        { name: 'claude-3-sonnet-20240229', provider: 'Anthropic', apiIdentifier: 'claude-3-sonnet-20240229', description: 'Balanced Claude 3 model', contextWindow: 200000, supportsJson: true, maxTokens: 4096 },
        { name: 'claude-3-haiku-20240307', provider: 'Anthropic', apiIdentifier: 'claude-3-haiku-20240307', description: 'Fastest Claude 3 model', contextWindow: 200000, supportsJson: true, maxTokens: 4096 },
        { name: 'gemini-1.5-pro-latest', provider: 'Google', apiIdentifier: 'gemini-1.5-pro-latest', description: 'Latest Gemini Pro model', contextWindow: 1000000, supportsJson: true, maxTokens: 8192 },
        { name: 'gemini-1.0-pro', provider: 'Google', apiIdentifier: 'gemini-1.0-pro', description: 'Standard Gemini Pro model', contextWindow: 32000, supportsJson: true, maxTokens: 2048 },
    ];
    for (const modelData of aiModelsData) {
        const model = await prisma.aIModel.upsert({
            where: { name: modelData.name },
            update: { ...modelData },
            create: modelData,
        });
        console.log(`Created/Updated AI Model: ${model.name}`);
    }

    // 3. Crear Environments
    console.log('Creating Environments...');
    const environmentsData = [
        { name: 'development', description: 'Development environment for testing and debugging.' },
        { name: 'staging', description: 'Staging environment for pre-production testing.' },
        { name: 'production', description: 'Live production environment.' },
        { name: 'testing', description: 'Automated testing environment.' },
    ];
    for (const envData of environmentsData) {
        const env = await prisma.environment.upsert({
            where: { name: envData.name },
            update: { description: envData.description },
            create: envData,
        });
        console.log(`Created/Updated Environment: ${env.name}`);
    }

    // 4. Crear Proyecto "Sample"
    console.log('Creating Sample Project...');
    const sampleProject = await prisma.project.upsert({
        where: { id: 'sample-project-id' },
        update: { description: 'A sample project for demonstration purposes.', ownerUserId: testUser.id },
        create: {
            id: 'sample-project-id',
            name: 'Sample',
            description: 'A sample project for demonstration purposes.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Created/Updated Project: ${sampleProject.name} (ID: ${sampleProject.id})`);

    // 5. Crear Tags útiles
    console.log('Creating Tags...');
    const tagsData = [
        { name: 'chatbot', description: 'Related to chatbot interactions.' },
        { name: 'summarization', description: 'Tasks involving text summarization.' },
        { name: 'translation', description: 'Tasks involving language translation.' },
        { name: 'rag', description: 'Related to Retrieval-Augmented Generation.' },
        { name: 'customer-service', description: 'Prompts for customer service scenarios.' },
        { name: 'internal-tool', description: 'Prompts for internal company tools.' },
        { name: 'marketing', description: 'Marketing related prompts.' },
    ];
    for (const tagData of tagsData) {
        const tag = await prisma.tag.upsert({
            where: { name: tagData.name },
            update: { description: tagData.description },
            create: tagData,
        });
        console.log(`Created/Updated Tag: ${tag.name}`);
    }

    // --- DATOS EXISTENTES (Región, CulturalData, etc.) ---

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
    const tacticFormalES = await prisma.tactic.create({
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
    const assetSaludo = await prisma.promptAsset.create({
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
    const assetSaludoV1 = await prisma.promptAssetVersion.create({
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

    // 9. Crear Prompt Lógico: Bienvenida Simple (con name slug y tags slugs)
    const promptName = 'Bienvenida Simple';
    const promptSlug = toSlug(promptName);
    const tagNames = ['bienvenida', 'general']; // Tags ya en formato slug
    console.log(`Creating Prompt '${promptSlug}' ...`);
    const promptBienvenida = await prisma.prompt.create({
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
    const promptBienvenidaV1 = await prisma.promptVersion.create({
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
    await prisma.promptAssetLink.create({
        data: {
            position: 1,
            usageContext: 'Inicio del prompt',
            promptVersion: { connect: { id: promptBienvenidaV1.id } },
            assetVersion: { connect: { id: assetSaludoV1.id } },
        }
    });
    console.log(`Linked Asset ${assetSaludo.key} v${assetSaludoV1.versionTag} to Prompt ${promptBienvenida.name} v${promptBienvenidaV1.versionTag}`);

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