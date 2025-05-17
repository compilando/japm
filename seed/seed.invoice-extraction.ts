import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Helper to convert to slug (simplified)
const toSlug = (str: string) => {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
};

// Define the fields we want to extract from an invoice
const invoiceFieldsToExtract = [
    { key: 'invoice-number', name: 'Invoice Number', description: 'The unique identifier for the invoice. Often labelled "Invoice #", "Invoice No.", "Factura Nº", etc. Usually alphanumeric.' },
    { key: 'invoice-date', name: 'Invoice Date', description: 'The date the invoice was issued. Look for labels like "Date", "Invoice Date", "Fecha". Format as YYYY-MM-DD if possible, otherwise extract as found.' },
    { key: 'due-date', name: 'Due Date', description: 'The date by which the payment is due. Look for labels like "Due Date", "Payment Due", "Fecha Vencimiento". Format as YYYY-MM-DD if possible.' },
    { key: 'vendor-name', name: 'Vendor Name', description: 'The name of the company or person issuing the invoice (the seller/provider). Often near the top, associated with a logo or address.' },
    { key: 'vendor-address', name: 'Vendor Address', description: 'The full address of the vendor issuing the invoice.' },
    { key: 'client-name', name: 'Client Name', description: 'The name of the company or person receiving the invoice (the buyer/customer). Look for labels like "Bill To", "Customer", "Cliente".' },
    { key: 'client-address', name: 'Client Address', description: 'The full address of the client receiving the invoice.' },
    { key: 'total-amount', name: 'Total Amount', description: 'The final total amount due on the invoice, including taxes and discounts. Look for labels like "Total", "Total Amount Due", "Grand Total". Extract as a number.' },
    { key: 'currency', name: 'Currency', description: 'The currency symbol or code (e.g., $, €, GBP, USD) associated with the total amount.' },
    { key: 'tax-amount', name: 'Tax Amount', description: 'The amount of tax included in the total. Look for labels like "Tax", "VAT", "IVA". Extract as a number. May be optional.' },
];

// Traducciones específicas para el proyecto de extracción de facturas
const invoiceTranslations = {
    assets: {
        'invoice-extraction-instructions': `Extract the following information from the document:
- Invoice number
- Date
- Total amount
- Vendor details
- Customer details
- Line items
- Taxes
- Payment terms`,
        'invoice-validation-rules': `Validation rules:
1. Invoice number must be unique
2. Date cannot be in the future
3. Total amount must match sum of items
4. All required fields must be present
5. Amounts must be positive`,
        'invoice-error-messages': `Error messages:
- "Duplicate invoice number"
- "Invalid date"
- "Total amount mismatch"
- "Missing required fields"
- "Negative amount detected"`,
        'invoice-standard-fields': `Invoice Number
Invoice Date
Due Date
Vendor Name
Vendor Address
Customer Name
Customer Address
Total Amount
Tax Amount
Line Item Description
Line Item Quantity
Line Item Unit Price
Line Item Total`
    },
    prompts: {
        'extract-invoice-data': `Given the following text extracted from an invoice via OCR:
\`\`\`
{{Invoice OCR Text}}
\`\`\`

Extract the following fields: {{invoice-standard-fields}}.

Format the output as a JSON object conforming to this schema:
{{invoice-json-schema}}

If a field is not found, use null as the value. Pay close attention to dates and amounts.`,
        'validate-invoice': `Validate the following invoice:

Data: {data}

Verify:
1. Unique invoice number
2. Valid date
3. Correct amounts
4. Required fields
5. Accurate calculations

Report any errors or inconsistencies.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const promptVersions = await prisma.promptVersion.findMany({
        where: { prompt: { projectId: projectId } },
        include: { prompt: { select: { id: true } } }
    });
    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: { asset: { prompt: { projectId: projectId } } },
        include: { asset: { select: { key: true } } }
    });
    for (const version of promptVersions) {
        const translationKey = version.prompt.id;
        const translationText = invoiceTranslations.prompts[translationKey] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
            update: { promptText: translationText },
            create: { versionId: version.id, languageCode: 'es-ES', promptText: translationText }
        });
        console.log(`Created Spanish translation for prompt version ${version.id} (slug: ${translationKey})`);
    }
    for (const version of promptAssetVersions) {
        if (version.asset && version.asset.key) {
            const translationText = invoiceTranslations.assets[version.asset.key] || version.value;
            await prisma.assetTranslation.upsert({
                where: { versionId_languageCode: { versionId: version.id, languageCode: 'es-ES' } },
                update: { value: translationText },
                create: { versionId: version.id, languageCode: 'es-ES', value: translationText }
            });
            console.log(`Created Spanish translation for asset version ${version.id} (key: ${version.asset.key})`);
        } else {
            console.warn(`Skipping translation for asset version ${version.id} due to missing asset key.`);
        }
    }
    console.log(`Finished creating Spanish translations for project ${projectId}`);
}

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Invoice Extraction...`);
    console.log(`Assuming base seed (user, envs, models, regions) already ran...`);

    // --- Find necessary base data ---
    let defaultTenant = await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } });
    if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    }

    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS), tenant: { connect: { id: defaultTenant.id } } } });

    // const defaultProjectId = 'default-project'; // Esta línea ya no es necesaria aquí directamente
    // Find base AI Model (assuming it exists and is global)
    const gpt4Model = await prisma.aIModel.findFirstOrThrow({
        where: { name: 'gpt-4o-2024-05-13' }, // Assuming name is unique enough *within seed data*
        select: { id: true }
    });

    // --- Create Project Specific Data ---
    // 1. Upsert Invoice Extraction Project
    const invoiceProject = await prisma.project.upsert({
        where: { id: 'invoice-extraction-project' },
        update: { name: 'Invoice Extraction', description: 'Automated invoice data extraction and processing.', ownerUserId: testUser.id },
        create: {
            id: 'invoice-extraction-project',
            name: 'Invoice Extraction',
            description: 'Automated invoice data extraction and processing.',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: testUser.tenantId } }
        },
    });
    console.log(`Upserted Project: ${invoiceProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto Invoice Extraction
    await createSpanishRegionAndCulturalData(invoiceProject.id);
    // Crear región en-US y datos culturales para el proyecto Invoice Extraction
    await createUSRegionAndCulturalData(invoiceProject.id);

    const invProjectId = invoiceProject.id;

    // Crear Environments para el proyecto Invoice Extraction
    const invDevEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: invProjectId } },
        update: {},
        create: { name: 'development', projectId: invProjectId, description: 'Development environment for Invoice Extraction project' },
        select: { id: true }
    });
    const invStagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: invProjectId } },
        update: {},
        create: { name: 'staging', projectId: invProjectId, description: 'Staging environment for Invoice Extraction project' },
        select: { id: true }
    });
    const invProdEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: invProjectId } },
        update: {},
        create: { name: 'production', projectId: invProjectId, description: 'Production environment for Invoice Extraction project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${invProjectId}`);

    // Create specific AI models for this project
    const invGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: invProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: invProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const invGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: invProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: invProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${invProjectId}`);

    // 2. Upsert Invoice Extraction Tags with prefix
    const invPrefix = 'inv_';
    const invBaseTags = ['invoice', 'data-extraction', 'ocr', 'structured-data', 'json-output', 'pdf-processing'];
    const invTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of invBaseTags) {
        const tagName = `${invPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: invProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: invProjectId },
            select: { id: true }
        });
        invTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${invProjectId}`);
    }
    // Helper function to get tag IDs from map
    const getInvTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => invTagMap.get(`${invPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // Definición de los Prompts Temáticos de Invoice Extraction con sus assets locales
    const invoiceProjectPrompts: {
        id: string;
        name: string;
        description: string;
        promptText: string;
        tags: string[];
        assets?: { key: string; name: string; initialValue: string; initialChangeMessage?: string }[];
        aiModelId?: string;
        activeInEnvironments?: { id: string }[];
    }[] = [
            {
                id: toSlug('extract-invoice-data'), // Usar la función toSlug definida en el archivo
                name: 'Extract Invoice Data',
                description: 'Extracts structured data from invoice OCR text.',
                promptText: invoiceTranslations.prompts['extract-invoice-data'] || 'Extract data from {{Invoice OCR Text}}',
                tags: ['data-extraction', 'ocr', 'json-output'],
                assets: [
                    {
                        key: 'invoice-standard-fields',
                        name: 'Invoice Standard Fields List',
                        initialValue: invoiceTranslations.assets['invoice-standard-fields'] || 'Invoice Number\nInvoice Date' // Fallback
                    },
                    {
                        key: 'invoice-json-schema', // Asumiendo que este asset también es necesario
                        name: 'Invoice JSON Schema Definition',
                        initialValue: `{ "invoiceNumber": null, "invoiceDate": null, ... }` // Placeholder, el valor real debería estar en invoiceTranslations o definirse aquí
                    }
                    // Otros assets como 'invoice-extraction-instructions' podrían ir aquí si son específicos de este prompt
                ],
                aiModelId: invGpt4o.id,
                activeInEnvironments: [{ id: invDevEnv.id }, { id: invStagingEnv.id }] // Actualizado
            },
            {
                id: toSlug('validate-invoice'),
                name: 'Validate Invoice Data',
                description: 'Validates extracted invoice data against a set of rules.',
                promptText: invoiceTranslations.prompts['validate-invoice'] || 'Validate invoice data: {{data}}',
                tags: ['data-extraction', 'validation'],
                assets: [
                    {
                        key: 'invoice-validation-rules',
                        name: 'Invoice Validation Rules',
                        initialValue: invoiceTranslations.assets['invoice-validation-rules'] || 'Rule 1: ...' // Fallback
                    },
                    {
                        key: 'invoice-error-messages',
                        name: 'Invoice Error Messages Template',
                        initialValue: invoiceTranslations.assets['invoice-error-messages'] || 'Error: ...' // Fallback
                    }
                ],
                aiModelId: invGpt4oMini.id, // Usar un modelo más pequeño/rápido para validación
                activeInEnvironments: [{ id: invDevEnv.id }, { id: invStagingEnv.id }] // Actualizado
            }
            // ... otros prompts temáticos de Invoice Extraction
        ];

    for (const promptData of invoiceProjectPrompts) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptData.id, projectId: invProjectId } },
            update: {
                name: promptData.name,
                description: promptData.description,
                tags: { connect: getInvTagIds(promptData.tags) }
            },
            create: {
                id: promptData.id,
                name: promptData.name,
                description: promptData.description,
                project: { connect: { id: invProjectId } },
                tags: { connect: getInvTagIds(promptData.tags) },
            },
        });
        console.log(`Upserted Prompt: ${prompt.name} (ID: ${prompt.id}) in project ${invProjectId}`);

        if (promptData.assets) {
            for (const assetInfo of promptData.assets) {
                const asset = await prisma.promptAsset.upsert({
                    where: {
                        prompt_asset_key_unique: { // Usando el nombre del constraint del schema
                            promptId: prompt.id,
                            projectId: invProjectId,
                            key: assetInfo.key,
                        }
                    },
                    update: {},
                    create: {
                        key: assetInfo.key,
                        promptId: prompt.id,
                        projectId: invProjectId, // Campo directo en PromptAsset según schema
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
                    console.log(`Created initial version for asset ${assetInfo.key} in prompt ${prompt.id}`);
                } else if (version.value !== assetInfo.initialValue) {
                    await prisma.promptAssetVersion.update({
                        where: { id: version.id },
                        data: { value: assetInfo.initialValue, changeMessage: `Updated initial value for ${assetInfo.name} during seed` }
                    });
                    console.log(`Updated initial version for asset ${assetInfo.key} in prompt ${prompt.id}`);
                }
            }
        }

        await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptData.promptText,
                status: 'active',
                changeMessage: `Initial version for ${promptData.name}. (Updated via upsert)`,
                activeInEnvironments: { set: promptData.activeInEnvironments || [{ id: invDevEnv.id }, { id: invStagingEnv.id }] },
                aiModelId: promptData.aiModelId || invGpt4o.id
            },
            create: {
                promptId: prompt.id,
                promptText: promptData.promptText,
                versionTag: 'v1.0.0', status: 'active',
                changeMessage: `Initial version for ${promptData.name}.`,
                activeInEnvironments: { connect: promptData.activeInEnvironments || [{ id: invDevEnv.id }, { id: invStagingEnv.id }] },
                aiModelId: promptData.aiModelId || invGpt4o.id
            },
        });
        console.log(`Upserted PromptVersion for ${prompt.name} V1`);
    }

    await createSpanishTranslations(invProjectId);
    console.log(`Finished seeding Invoice Extraction.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });