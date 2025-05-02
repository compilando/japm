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
    await prisma.promptAssetLink.deleteMany({});
    await prisma.promptTranslation.deleteMany({});
    await prisma.assetTranslation.deleteMany({});
    await prisma.promptVersion.deleteMany({}); // Depends on Prompt, Env
    await prisma.promptAssetVersion.deleteMany({}); // Depends on Asset, Env
    await prisma.prompt.deleteMany({}); // Depends on Project, Tactic, Tags
    await prisma.tactic.deleteMany({}); // Depends on Project, Region, CulturalData
    await prisma.promptAsset.deleteMany({}); // Depends on Project
    await prisma.tag.deleteMany({}); // Depends on Prompt
    await prisma.project.deleteMany({}); // Depends on User, AIModel
    await prisma.environment.deleteMany({}); // Referenced by Versions
    await prisma.aIModel.deleteMany({}); // Depends on Project
    await prisma.culturalData.deleteMany({}); // Depends on Region
    await prisma.region.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Existing data deleted.');

    // --- BASE DATA --- //

    // 1. Create Test User
    console.log('Upserting test user...');
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: { name: 'Test User', password: hashedPassword }, // Ensure data is updated if user exists
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: hashedPassword,
        },
    });
    console.log(`Upserted user: ${testUser.email}`);

    // 2. Create AI Models
    console.log('Upserting AI Models...');
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
            update: { ...modelData }, // Update all fields
            create: modelData,
        });
        console.log(`Upserted AI Model: ${model.name}`);
    }

    // 3. Create Environments
    console.log('Upserting Environments...');
    const environmentsData = [
        { name: 'development', description: 'Development environment for testing and debugging.' },
        { name: 'staging', description: 'Staging environment for pre-production testing.' },
        { name: 'production', description: 'Live production environment.' },
        { name: 'testing', description: 'Automated testing environment.' },
    ];
    for (const envData of environmentsData) {
        const env = await prisma.environment.upsert({
            where: { name: envData.name },
            update: { description: envData.description }, // Only update description if needed
            create: envData,
        });
        console.log(`Upserted Environment: ${env.name}`);
    }

    // 4. Create ES Region and CulturalData
    console.log('Upserting Region ES...');
    const regionES = await prisma.region.upsert({
        where: { languageCode: 'es-ES' },
        update: { name: 'Spain', timeZone: 'Europe/Madrid' },
        create: {
            name: 'Spain',
            languageCode: 'es-ES',
            timeZone: 'Europe/Madrid',
        },
    });
    console.log(`Upserted Region: ${regionES.name}`);

    console.log('Upserting CulturalData ES...');
    await prisma.culturalData.upsert({
        where: { id: "direct-and-formal" }, // Assuming ID is the primary identifier
        update: { formalityLevel: 5, style: 'Direct but formal', regionId: regionES.languageCode },
        create: {
            id: "direct-and-formal",
            formalityLevel: 5,
            style: 'Direct but formal',
            region: { connect: { languageCode: regionES.languageCode } },
        },
    });
    console.log(`Upserted CulturalData for ES (ID: direct-and-formal)`);

    // 5. Create US Region and CulturalData
    console.log('Upserting Region US...');
    const regionUS = await prisma.region.upsert({
        where: { languageCode: 'en-US' },
        update: { name: 'United States', timeZone: 'America/New_York' },
        create: { name: 'United States', languageCode: 'en-US', timeZone: 'America/New_York' },
    });
    console.log('Upserting CulturalData US...');
    await prisma.culturalData.upsert({
        where: { id: regionUS.languageCode }, // Using language code as ID here
        update: { formalityLevel: 3, style: 'Informal and direct', regionId: regionUS.languageCode },
        create: {
            id: regionUS.languageCode,
            formalityLevel: 3,
            style: 'Informal and direct',
            region: { connect: { languageCode: regionUS.languageCode } },
        },
    });
    console.log(`Upserted CulturalData for US (ID: ${regionUS.languageCode})`);

    // --- COMMON ASSETS --- 
    // Removed common assets - they should be created in their specific seed files if not truly shared.
    /*
    console.log('Upserting common assets...');
    const assetPythonImports = await prisma.promptAsset.upsert({ ... });
    await prisma.promptAssetVersion.upsert({ ... });
    console.log(`Upserted common asset: ${assetPythonImports.key} and version v1.0.0`);
    */

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