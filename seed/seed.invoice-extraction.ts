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

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Invoice Extraction...`);
    console.log(`Assuming base seed (user, envs, models, regions) already ran...`);

    // --- Find necessary base data ---
    const testUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test@example.com' },
        select: { id: true }
    });

    const defaultProjectId = 'default-project'; // ID del proyecto donde buscar los entornos base
    const prodEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { projectId: defaultProjectId, name: 'production' } },
        select: { id: true }
    });
    // Find base AI Model (assuming it exists and is global)
    const gpt4Model = await prisma.aIModel.findFirstOrThrow({
        where: { name: 'gpt-4o-2024-05-13' }, // Assuming name is unique enough *within seed data*
        select: { id: true }
    });

    // --- Create Project Specific Data ---
    // 1. Upsert Invoice Extraction Project
    const invoiceProject = await prisma.project.upsert({
        where: { id: 'invoice-extraction-project' },
        update: { name: 'Invoice Data Extraction', description: 'AI-powered invoice data extraction and processing.', ownerUserId: testUser.id },
        create: {
            id: 'invoice-extraction-project',
            name: 'Invoice Data Extraction',
            description: 'AI-powered invoice data extraction and processing.',
            owner: { connect: { id: testUser.id } }
        },
    });
    console.log(`Upserted Project: ${invoiceProject.name}`);

    // Crear región es-ES y datos culturales para el proyecto Invoice Extraction
    await createSpanishRegionAndCulturalData(invoiceProject.id);
    // Crear región en-US y datos culturales para el proyecto Invoice Extraction
    await createUSRegionAndCulturalData(invoiceProject.id);

    const invProjectId = invoiceProject.id;

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

    // 3. Upsert Invoice Extraction Assets and Versions
    const invoiceFieldsAssetName = 'Invoice Standard Fields List';
    const assetInvoiceFields = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: invProjectId,
                key: 'invoice-standard-fields'
            }
        },
        update: {},
        create: {
            key: 'invoice-standard-fields',
            projectId: invProjectId
        }
    });
    const assetInvoiceFieldsV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetInvoiceFields.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: 'Invoice Number\nInvoice Date\nDue Date\nVendor Name\nVendor Address\nCustomer Name\nCustomer Address\nTotal Amount\nTax Amount\nLine Item Description\nLine Item Quantity\nLine Item Unit Price\nLine Item Total',
            status: 'active',
            changeMessage: invoiceFieldsAssetName
        },
        create: {
            assetId: assetInvoiceFields.id,
            value: 'Invoice Number\nInvoice Date\nDue Date\nVendor Name\nVendor Address\nCustomer Name\nCustomer Address\nTotal Amount\nTax Amount\nLine Item Description\nLine Item Quantity\nLine Item Unit Price\nLine Item Total',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: invoiceFieldsAssetName
        },
        select: { id: true }
    });

    const jsonSchemaAssetName = 'Target JSON Schema for Invoice';
    const assetJsonSchema = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: {
                projectId: invProjectId,
                key: 'invoice-json-schema'
            }
        },
        update: {},
        create: {
            key: 'invoice-json-schema',
            projectId: invProjectId
        }
    });
    const assetJsonSchemaV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetJsonSchema.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: JSON.stringify({
                type: "object",
                properties: {
                    invoiceNumber: { type: "string" },
                    invoiceDate: { type: "string", format: "date" },
                    dueDate: { type: "string", format: "date" },
                    vendorName: { type: "string" },
                    totalAmount: { type: "number" },
                    taxAmount: { type: ["number", "null"] }
                    /* Add other fields as needed */
                },
                required: ["invoiceNumber", "invoiceDate", "vendorName", "totalAmount"]
            }, null, 2),
            status: 'active',
            changeMessage: jsonSchemaAssetName
        },
        create: {
            assetId: assetJsonSchema.id,
            value: JSON.stringify({
                type: "object",
                properties: {
                    invoiceNumber: { type: "string" },
                    invoiceDate: { type: "string", format: "date" },
                    dueDate: { type: "string", format: "date" },
                    vendorName: { type: "string" },
                    totalAmount: { type: "number" },
                    taxAmount: { type: ["number", "null"] }
                    /* Add other fields as needed */
                },
                required: ["invoiceNumber", "invoiceDate", "vendorName", "totalAmount"]
            }, null, 2),
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: jsonSchemaAssetName
        },
        select: { id: true }
    });
    console.log('Upserted Invoice Extraction Assets and V1 Versions');

    // 4. Upsert Invoice Extraction Prompt and Version
    const promptExtractName = 'extract-invoice-data';
    const promptExtractSlug = toSlug(promptExtractName);
    const promptExtract = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: promptExtractSlug,
                projectId: invProjectId
            }
        },
        update: {
            name: promptExtractName,
            description: 'Extract key fields from invoice text (OCR result). Output as JSON.',
            tags: { set: getInvTagIds(['invoice', 'data-extraction', 'structured-data', 'json-output']) }
        },
        create: {
            id: promptExtractSlug,
            name: promptExtractName,
            description: 'Extract key fields from invoice text (OCR result). Output as JSON.',
            projectId: invProjectId,
            tags: { connect: getInvTagIds(['invoice', 'data-extraction', 'structured-data', 'json-output']) }
        },
        select: { id: true, name: true }
    });

    const promptExtractV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptExtract.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Given the following text extracted from an invoice via OCR:\n\`\`\`\n{{Invoice OCR Text}}\n\`\`\`\n\nExtract the following fields: {{invoice-standard-fields}}.\n\nFormat the output as a JSON object conforming to this schema:\n{{invoice-json-schema}}\n\nIf a field is not found, use null as the value. Pay close attention to dates and amounts.`,
            status: 'active',
            aiModelId: invGpt4o.id, // Connect project-specific AI model
            activeInEnvironments: { set: [{ id: prodEnvironment.id }] }
        },
        create: {
            promptId: promptExtract.id,
            promptText: `Given the following text extracted from an invoice via OCR:\n\`\`\`\n{{Invoice OCR Text}}\n\`\`\`\n\nExtract the following fields: {{invoice-standard-fields}}.\n\nFormat the output as a JSON object conforming to this schema:\n{{invoice-json-schema}}\n\nIf a field is not found, use null as the value. Pay close attention to dates and amounts.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for extracting invoice data to JSON using GPT-4o.',
            aiModelId: invGpt4o.id, // Connect project-specific AI model
            activeInEnvironments: { connect: [{ id: prodEnvironment.id }] }
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptExtract.name} V1`);

    console.log(`Invoice Extraction seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });