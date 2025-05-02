import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    console.log(`Start base seeding (Cleanup, User, AI Models, Environments, Regions)...`);

    // --- Optional Cleanup ---
    console.log('Deleting existing data...');
    // Delete in reverse order of dependency or use transaction if needed
    // Adjusted order based on corrected schema dependencies
    await prisma.promptExecutionLog.deleteMany({});
    await prisma.promptAssetLink.deleteMany({});
    await prisma.assetTranslation.deleteMany({});
    await prisma.promptTranslation.deleteMany({});
    await prisma.promptVersion.deleteMany({});
    await prisma.promptAssetVersion.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.prompt.deleteMany({});
    await prisma.tactic.deleteMany({});
    await prisma.culturalData.deleteMany({});
    await prisma.ragDocumentMetadata.deleteMany({});
    await prisma.region.deleteMany({});
    await prisma.environment.deleteMany({});
    await prisma.promptAsset.deleteMany({});
    // AIModel is ManyToMany, relation handled by Prisma implicitly? Or delete manually if needed.
    await prisma.aIModel.deleteMany({}); // Keep for now
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

    // 3. Create AI Models (Still global ManyToMany based on schema)
    console.log('Upserting AI Models...');
    const aiModelsData = [
        { id: 'gpt-4-turbo', name: 'gpt-4-turbo-2024-04-09', provider: 'OpenAI', apiIdentifier: 'gpt-4-turbo-2024-04-09', description: 'Latest GPT-4 Turbo model', contextWindow: 128000, supportsJson: true, maxTokens: 4096 },
        { id: 'gpt-4o', name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiIdentifier: 'gpt-4o-2024-05-13', description: 'Latest omni model from OpenAI', contextWindow: 128000, supportsJson: true, maxTokens: 4096 },
        { id: 'claude-3-opus', name: 'claude-3-opus-20240229', provider: 'Anthropic', apiIdentifier: 'claude-3-opus-20240229', description: 'Most powerful Claude 3 model', contextWindow: 200000, supportsJson: true, maxTokens: 4096 },
        { id: 'claude-3-sonnet', name: 'claude-3-sonnet-20240229', provider: 'Anthropic', apiIdentifier: 'claude-3-sonnet-20240229', description: 'Balanced Claude 3 model', contextWindow: 200000, supportsJson: true, maxTokens: 4096 },
        { id: 'claude-3-haiku', name: 'claude-3-haiku-20240307', provider: 'Anthropic', apiIdentifier: 'claude-3-haiku-20240307', description: 'Fastest Claude 3 model', contextWindow: 200000, supportsJson: true, maxTokens: 4096 },
        { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro-latest', provider: 'Google', apiIdentifier: 'gemini-1.5-pro-latest', description: 'Latest Gemini Pro model', contextWindow: 1000000, supportsJson: true, maxTokens: 8192 },
        { id: 'gemini-1.0-pro', name: 'gemini-1.0-pro', provider: 'Google', apiIdentifier: 'gemini-1.0-pro', description: 'Standard Gemini Pro model', contextWindow: 32000, supportsJson: true, maxTokens: 2048 },
    ];
    for (const modelData of aiModelsData) {
        await prisma.aIModel.upsert({
            where: { id: modelData.id }, // Use ID for upsert
            update: { ...modelData },
            create: modelData,
        });
        console.log(`Upserted AI Model: ${modelData.name}`);
    }

    // 4. Create Environments (Associated with Default Project)
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

    // 5. Create ES Region and CulturalData (Associated with Default Project)
    console.log('Upserting Region ES...');
    const regionES = await prisma.region.upsert({
        where: { languageCode: 'es-ES' },
        update: { name: 'Spain', timeZone: 'Europe/Madrid', projectId: defaultProject.id }, // Ensure projectId on update too
        create: {
            name: 'Spain',
            languageCode: 'es-ES',
            timeZone: 'Europe/Madrid',
            projectId: defaultProject.id // Connect using projectId directly in create
        }
    });
    console.log(`Upserted Region: ${regionES.name}`);

    console.log('Upserting CulturalData ES...');
    await prisma.culturalData.upsert({
        where: { id: "direct-and-formal" },
        update: { formalityLevel: 8, style: 'Direct, formal language common in Spanish business.', regionId: regionES.languageCode, projectId: defaultProject.id },
        create: {
            id: "direct-and-formal",
            formalityLevel: 8,
            style: 'Direct, formal language common in Spanish business.',
            regionId: regionES.languageCode, // Use direct regionId
            projectId: defaultProject.id // Use direct projectId
        }
    });
    console.log(`Upserted CulturalData for ES (ID: direct-and-formal)`);

    // 6. Create US Region and CulturalData (Associated with Default Project)
    console.log('Upserting Region US...');
    const regionUS = await prisma.region.upsert({
        where: { languageCode: 'en-US' },
        update: { name: 'United States', timeZone: 'America/New_York', projectId: defaultProject.id }, // Ensure projectId on update too
        create: {
            name: 'United States',
            languageCode: 'en-US',
            timeZone: 'America/New_York',
            projectId: defaultProject.id // Connect using projectId directly in create
        }
    });
    console.log(`Upserted Region: ${regionUS.name}`);

    console.log('Upserting CulturalData US...');
    await prisma.culturalData.upsert({
        where: { id: 'en-US' },
        update: { formalityLevel: 5, style: 'Standard American English, generally informal.', regionId: regionUS.languageCode, projectId: defaultProject.id },
        create: {
            id: 'en-US',
            formalityLevel: 5,
            style: 'Standard American English, generally informal.',
            regionId: regionUS.languageCode, // Use direct regionId
            projectId: defaultProject.id // Use direct projectId
        }
    });
    console.log(`Upserted CulturalData for US (ID: en-US)`);

    console.log(`Base seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });