import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    console.log(`Start seeding for Invoice Data Extraction...`);
    console.log(`-----------------------------------`);
    console.log('Assuming prior cleanup...'); // Add specific deletes if needed

    // --- Ensure Base Data Exists (User, Models, Environments) ---
    const testUser = await prisma.user.upsert({ where: { email: 'test@example.com' }, update: {}, create: { email: 'test@example.com', name: 'Test User', password: await bcrypt.hash('password123', SALT_ROUNDS) } });
    // Assume AI Models (esp. one good at JSON) and Environments are created.
    // Let's ensure a relevant AI Model exists
    const jsonModel = await prisma.aIModel.upsert({
        where: { name: 'gpt-4o-2024-05-13' }, // Assuming this exists from original seed
        update: { supportsJson: true },
        create: {
            name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiIdentifier: 'gpt-4o-2024-05-13', description: 'Latest omni model from OpenAI', contextWindow: 128000, supportsJson: true, maxTokens: 4096
        }
    });
    console.log(`Ensured AI Model ${jsonModel.name} supports JSON.`);


    // --- Extraction Project ---
    const extractionProject = await prisma.project.upsert({
        where: { id: 'invoice-processing-system' },
        update: { name: 'Invoice Processing System', description: 'Extracting key data from scanned invoices.' },
        create: {
            id: 'invoice-processing-system',
            name: 'Invoice Processing System',
            description: 'Extracting key data from scanned invoices.',
            owner: { connect: { id: testUser.id } },
            // Optionally link specific models good for extraction
            aiModels: { connect: { id: jsonModel.id } }
        },
    });
    console.log(`Created Project: ${extractionProject.name}`);

    // --- Extraction Tags ---
    const extractionTags = ['extraction', 'invoice', 'finance', 'ocr', 'json', 'automation'];
    for (const tagName of extractionTags) {
        await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
        console.log(`Upserted Tag: ${tagName}`);
    }

    // --- Create Assets for each Field to Extract ---
    const createdAssetVersions: { key: string, versionId: string }[] = [];
    for (const field of invoiceFieldsToExtract) {
        const asset = await prisma.promptAsset.create({
            data: {
                key: field.key,
                name: field.name,
                description: field.description, // Description holds the extraction instruction for this field
                type: 'Extraction Field', // Custom type
                category: 'Invoice Data', // Custom category
                project: { connect: { id: extractionProject.id } }
            }
        });

        const assetVersion = await prisma.promptAssetVersion.create({
            data: {
                asset: { connect: { key: asset.key } },
                // Value could hold example format, validation regex, etc. but description is key here.
                value: `Example format or type hint: ${field.key.includes('date') ? 'YYYY-MM-DD' : (field.key.includes('amount') ? 'Number' : 'String')}`,
                versionTag: 'v1.0.0',
                status: 'active',
                // Activate in relevant environments
                activeInEnvironments: { connect: [{ name: 'staging' }, { name: 'production' }] }
            }
        });
        createdAssetVersions.push({ key: field.key, versionId: assetVersion.id });
        console.log(`Created Asset & V1 Version for Field: ${field.name}`);
    }


    // --- Create the Main Extraction Prompt ---
    const promptExtract = await prisma.prompt.create({
        data: {
            name: 'extract-invoice-data-json',
            description: 'Extracts key fields from invoice text into JSON format, using linked assets for field definitions.',
            project: { connect: { id: extractionProject.id } },
            tags: { connect: [{ name: 'extraction' }, { name: 'invoice' }, { name: 'json' }] }
        }
    });

    // --- Create Version 1 of the Extraction Prompt ---
    // This prompt expects the OCR'd text of the invoice to be injected at runtime.
    const promptExtractV1 = await prisma.promptVersion.create({
        data: {
            prompt: { connect: { name: promptExtract.name } },
            promptText: `You are an expert invoice data extraction AI.
Analyze the following invoice text provided between '''triple quotes'''.
Extract the data points specified by the linked field assets. Use the description of each linked asset to understand exactly what information to find for that field.
Format your output strictly as a JSON object, where the keys are the 'key' names of the linked assets (e.g., "invoice-number", "total-amount") and the values are the extracted data.
If a field cannot be found or is not applicable, use a null value for that key in the JSON.
Do not include any explanation or introductory text outside the JSON object.

'''
{{Invoice OCR Text}}
'''

JSON Output:`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: 'Initial version for extracting invoice fields defined by linked assets into JSON.',
            // Activate in relevant environments
            activeInEnvironments: { connect: [{ name: 'staging' }, { name: 'production' }] }
        }
    });
    console.log(`Created Prompt ${promptExtract.name} V1`);

    // --- Link the Field Assets to the Main Prompt Version ---
    const assetLinks = createdAssetVersions.map((assetVer, index) => ({
        promptVersionId: promptExtractV1.id,
        assetVersionId: assetVer.versionId,
        // Usage context clearly indicates the purpose of the link/asset for the AI
        usageContext: `Field to extract: ${assetVer.key}`,
        position: index + 1, // Define order in prompt or potentially desired JSON output order
        isRequired: !['tax-amount'].includes(assetVer.key), // Example: Make tax optional
    }));

    await prisma.promptAssetLink.createMany({
        data: assetLinks
    });
    console.log(`Linked ${createdAssetVersions.length} field assets to ${promptExtract.name} V1`);


    console.log(`Invoice Data Extraction seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });