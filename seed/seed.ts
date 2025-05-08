import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData } from './helpers';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Helper to convert to slug (simplified, use a library for more robustness)
const toSlug = (str: string) => {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters except hyphens
        .replace(/--+/g, '-') // Replace multiple hyphens with one
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

async function main() {
    console.log(`Start base seeding (User, AI Models, Environments, Regions)...`);

    // --- Optional Cleanup (Commented out after DB reset) ---

    console.log('Deleting existing data...');
    await prisma.promptExecutionLog.deleteMany({});
    await prisma.assetTranslation.deleteMany({});
    await prisma.promptTranslation.deleteMany({});
    await prisma.promptVersion.deleteMany({});
    await prisma.promptAssetVersion.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.prompt.deleteMany({});
    await prisma.culturalData.deleteMany({});
    await prisma.ragDocumentMetadata.deleteMany({});
    await prisma.region.deleteMany({});
    await prisma.environment.deleteMany({});
    await prisma.promptAsset.deleteMany({});
    await prisma.aIModel.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Existing data deleted.');


    // --- BASE DATA --- //

    // 1. Create Test User
    console.log('Upserting test user...');
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: { name: 'Test User', password: hashedPassword },
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: hashedPassword,
        },
    });
    console.log(`Upserted user: ${testUser.name}`);

    // 2. Create Default Project
    const defaultProject = await prisma.project.upsert({
        where: { id: 'default-project' },
        update: { name: 'Default Project', description: 'Project for base/shared entities.', owner: { connect: { id: testUser.id } } },
        create: { id: 'default-project', name: 'Default Project', description: 'Project for base/shared entities.', owner: { connect: { id: testUser.id } } },
    });
    console.log(`Upserted default project: ${defaultProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto por defecto
    await createSpanishRegionAndCulturalData(defaultProject.id);

    // 3. Create Generic Tags for Default Project
    console.log('Upserting Generic Tags...');
    const genericTags = [
        { name: 'Core', description: 'Core functionality or widely used.' },
        { name: 'Experimental', description: 'Features under development or testing.' },
        { name: 'Deprecated', description: 'Features planned for removal.' },
        { name: 'UI/Frontend', description: 'Related to User Interface.' },
        { name: 'Backend', description: 'Related to backend logic or services.' },
        { name: 'Marketing', description: 'Related to marketing campaigns or content.' },
        { name: 'Internal', description: 'For internal tools or processes.' },
    ];

    for (const tagData of genericTags) {
        await prisma.tag.upsert({
            where: { projectId_name: { name: tagData.name, projectId: defaultProject.id } },
            update: { description: tagData.description }, // Update description if tag exists
            create: {
                name: tagData.name,
                description: tagData.description,
                projectId: defaultProject.id, // Associate with default project
            },
        });
        console.log(`Upserted Tag: ${tagData.name}`);
    }

    // 4. Create Specific AI Models for the Default Project
    console.log(`Upserting specific AI Models for project: ${defaultProject.id}...`);
    const projectAiModels = [
        {
            id: 'gpt-4o', // Keep ID globally unique for simplicity, but scoped by project logic
            name: 'GPT-4o',
            provider: 'OpenAI',
            apiIdentifier: 'gpt-4o',
            description: 'Fast, intelligent, flexible GPT model',
            temperature: 0.7,
            apiKeyEnvVar: 'OPENAI_API_KEY', // Example env var name
            supportsJson: true,
            contextWindow: 128000,
            maxTokens: 4096
        },
        {
            id: 'gpt-4o-mini',
            name: 'GPT-4o mini',
            provider: 'OpenAI',
            apiIdentifier: 'gpt-4o-mini',
            description: 'Fast, affordable small model for focused tasks',
            temperature: 0.7,
            apiKeyEnvVar: 'OPENAI_API_KEY',
            supportsJson: true,
            contextWindow: 128000, // Check actual value if needed
            maxTokens: 4096 // Check actual value if needed
        }
    ];

    for (const modelData of projectAiModels) {
        await prisma.aIModel.upsert({
            where: {
                // Use the project-specific unique constraint
                projectId_name: { projectId: defaultProject.id, name: modelData.name }
            },
            update: {
                // Update all fields except projectId and name
                provider: modelData.provider,
                description: modelData.description,
                apiIdentifier: modelData.apiIdentifier,
                maxTokens: modelData.maxTokens,
                supportsJson: modelData.supportsJson,
                contextWindow: modelData.contextWindow,
                temperature: modelData.temperature,
                apiKeyEnvVar: modelData.apiKeyEnvVar,
                // id: modelData.id, // ID is auto-generated by cuid() on create, cannot be updated like this
            },
            create: {
                // Let cuid() generate the ID on create
                name: modelData.name,
                provider: modelData.provider,
                description: modelData.description,
                apiIdentifier: modelData.apiIdentifier,
                maxTokens: modelData.maxTokens,
                supportsJson: modelData.supportsJson,
                contextWindow: modelData.contextWindow,
                temperature: modelData.temperature,
                apiKeyEnvVar: modelData.apiKeyEnvVar,
                projectId: defaultProject.id, // Connect to the project
            },
        });
        console.log(`Upserted AI Model: ${modelData.name} for project ${defaultProject.id}`);
    }

    // 5. Create Environments (Associated with Default Project)
    console.log('Upserting Environments...');
    const environments = [
        { name: 'development', description: 'For active development and testing' },
        { name: 'staging', description: 'Staging environment for pre-production testing.' },
        { name: 'production', description: 'Live production environment.' },
        { name: 'testing', description: 'Automated testing environment.' },
    ];
    for (const envData of environments) {
        // Use the composite key directly in where for upsert
        await prisma.environment.upsert({
            where: { projectId_name: { name: envData.name, projectId: defaultProject.id } },
            update: { description: envData.description },
            create: {
                name: envData.name,
                description: envData.description,
                projectId: defaultProject.id // Connect using projectId directly in create
            }
        });
        console.log(`Upserted Environment: ${envData.name}`);
    }

    // 6. Create US Region and CulturalData (Associated with Default Project)
    console.log('Upserting Region US...');
    const regionUS = await prisma.region.upsert({
        where: {
            projectId_languageCode: {
                projectId: defaultProject.id,
                languageCode: 'en-US'
            }
        },
        update: {
            name: 'United States',
            timeZone: 'America/New_York'
        },
        create: {
            languageCode: 'en-US',
            name: 'United States',
            timeZone: 'America/New_York',
            project: { connect: { id: defaultProject.id } }
        }
    });
    console.log(`Upserted Region: ${regionUS.name} (ID: ${regionUS.id})`);

    console.log('Upserting CulturalData US...');
    await prisma.culturalData.upsert({
        where: {
            projectId_key: {
                projectId: defaultProject.id,
                key: 'standard-american-english'
            }
        },
        update: {
            formalityLevel: 5,
            style: 'Standard American English, generally informal.',
            region: { connect: { id: regionUS.id } }
        },
        create: {
            key: 'standard-american-english',
            formalityLevel: 5,
            style: 'Standard American English, generally informal.',
            project: { connect: { id: defaultProject.id } },
            region: { connect: { id: regionUS.id } }
        }
    });
    console.log(`Upserted CulturalData for US (Key: standard-american-english)`);

    // console.log('Upserted CulturalData for US (ID: standard-business)'); // Esta línea parecía un log huérfano

    // 8. Upsert Specific System Prompts (Global)
    console.log('Upserting specific System Prompts...');
    await prisma.systemPrompt.upsert({
        where: { name: 'prompt-improver' },
        update: {
            description: 'Improves a given prompt based on best practices.',
            promptText: "${file('resources/system-prompts/prompt-improver.md')}", // Asegúrate que esta ruta sea correcta
            category: 'Prompt Engineering',
        },
        create: {
            name: 'prompt-improver',
            description: 'Improves a given prompt based on best practices.',
            promptText: "${file('resources/system-prompts/prompt-improver.md')}", // Asegúrate que esta ruta sea correcta
            category: 'Prompt Engineering',
        },
    });
    console.log('Upserted System Prompt: prompt-improver');

    // --- Default Project Assets ---
    console.log('Upserting Default Project Assets...');
    const defaultAssets = [
        {
            key: 'company-mission-statement',
            name: 'Company Mission Statement',
            // type: 'Core Value',
            // description: 'The official mission statement of the company.',
            versionValue: 'Our mission is to empower individuals and businesses through innovative technology and exceptional service, fostering a future where potential is limitless.'
        },
        {
            key: 'standard-disclaimer',
            name: 'Standard Legal Disclaimer',
            // type: 'Legal Text',
            // description: 'Standard legal disclaimer for all external communications.',
            versionValue: 'This communication is for informational purposes only and does not constitute legal, financial, or professional advice. Consult with a qualified professional before making any decisions.'
        },
        {
            key: 'product-feature-list-alpha',
            name: 'Product Alpha - Feature List',
            // type: 'Product Info',
            // description: 'Key features of Product Alpha.',
            versionValue: '1. AI-Powered Analytics. 2. Real-time Collaboration. 3. Customizable Dashboards. 4. Secure Data Encryption. 5. Automated Reporting.'
        }
    ];

    for (const assetData of defaultAssets) {
        const asset = await prisma.promptAsset.upsert({
            where: {
                project_asset_key_unique: { // Corregido según el nombre del constraint
                    projectId: defaultProject.id,
                    key: assetData.key,
                }
            },
            update: {
                // 'name' eliminado, PromptAsset no tiene este campo
            },
            create: {
                key: assetData.key,
                // 'name' eliminado, PromptAsset no tiene este campo
                projectId: defaultProject.id,
            },
            select: {
                id: true,
                key: true,
                // 'name' eliminado
                projectId: true,
                createdAt: true,
                updatedAt: true
            }
        });
        console.log(`Upserted Asset: ${assetData.name} (Key: ${asset.key})`);

        // Crear o actualizar la PromptAssetVersion asociada
        await prisma.promptAssetVersion.upsert({
            where: {
                assetId_versionTag: { // Asumiendo este nombre para el constraint @@unique([assetId, versionTag])
                    assetId: asset.id,
                    versionTag: 'v1.0.0'
                }
            },
            update: {
                value: assetData.versionValue,
                changeMessage: assetData.name, // Usar el 'name' del asset como 'changeMessage' de la versión
                status: 'active'
            },
            create: {
                assetId: asset.id,
                value: assetData.versionValue,
                versionTag: 'v1.0.0',
                changeMessage: assetData.name, // Usar el 'name' del asset como 'changeMessage' de la versión
                status: 'active'
            }
        });
        console.log(`Upserted AssetVersion for ${assetData.name} (Key: ${asset.key}, Version: v1.0.0)`);
    }

    // --- END BASE DATA --- //

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