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
        const translation = invoiceTranslations.prompts[version.prompt.id] || version.promptText;
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
        const translation = invoiceTranslations.assets[version.asset.key] || version.value;
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

    // Crear un Prompt padre para los assets comunes de Invoice Extraction
    const invCommonAssetsPromptSlug = 'invoice-extraction-common-assets';
    const invCommonAssetsPrompt = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: invCommonAssetsPromptSlug,
                projectId: invProjectId,
            },
        },
        update: { name: 'Invoice Extraction Common Assets' },
        create: {
            id: invCommonAssetsPromptSlug,
            name: 'Invoice Extraction Common Assets',
            description: 'Common reusable assets for Invoice Extraction prompts.',
            projectId: invProjectId,
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt for common Invoice Extraction assets: ${invCommonAssetsPrompt.id}`);

    // 3. Upsert Invoice Extraction Assets and their versions
    const extractionInstructionsName = 'Invoice Extraction Instructions';
    const assetExtractionInstructions = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: invCommonAssetsPrompt.id,
                projectId: invProjectId,
                key: 'invoice-extraction-instructions'
            }
        },
        update: {},
        create: {
            key: 'invoice-extraction-instructions',
            promptId: invCommonAssetsPrompt.id,
            projectId: invProjectId
        }
    });
    const assetExtractionInstructionsV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetExtractionInstructions.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Extract the following information from the document:\n- Invoice number\n- Date\n- Total amount\n- Vendor details\n- Customer details\n- Line items\n- Taxes\n- Payment terms`,
            status: 'active',
            changeMessage: extractionInstructionsName
        },
        create: {
            assetId: assetExtractionInstructions.id,
            value: `Extract the following information from the document:\n- Invoice number\n- Date\n- Total amount\n- Vendor details\n- Customer details\n- Line items\n- Taxes\n- Payment terms`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: extractionInstructionsName
        },
        select: { id: true }
    });

    const validationRulesName = 'Invoice Validation Rules';
    const assetValidationRules = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: invCommonAssetsPrompt.id,
                projectId: invProjectId,
                key: 'invoice-validation-rules'
            }
        },
        update: {},
        create: {
            key: 'invoice-validation-rules',
            promptId: invCommonAssetsPrompt.id,
            projectId: invProjectId
        }
    });
    const assetValidationRulesV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetValidationRules.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Validation rules:\n1. Invoice number must be unique\n2. Date cannot be in the future\n3. Total amount must match sum of items\n4. All required fields must be present\n5. Amounts must be positive`,
            status: 'active',
            changeMessage: validationRulesName
        },
        create: {
            assetId: assetValidationRules.id,
            value: `Validation rules:\n1. Invoice number must be unique\n2. Date cannot be in the future\n3. Total amount must match sum of items\n4. All required fields must be present\n5. Amounts must be positive`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: validationRulesName
        },
        select: { id: true }
    });

    const errorMessagesName = 'Invoice Error Messages';
    const assetErrorMessages = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: invCommonAssetsPrompt.id,
                projectId: invProjectId,
                key: 'invoice-error-messages'
            }
        },
        update: {},
        create: {
            key: 'invoice-error-messages',
            promptId: invCommonAssetsPrompt.id,
            projectId: invProjectId
        }
    });
    const assetErrorMessagesV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetErrorMessages.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Error messages:\n- "Duplicate invoice number"\n- "Invalid date"\n- "Total amount mismatch"\n- "Missing required fields"\n- "Negative amount detected"`,
            status: 'active',
            changeMessage: errorMessagesName
        },
        create: {
            assetId: assetErrorMessages.id,
            value: `Error messages:\n- "Duplicate invoice number"\n- "Invalid date"\n- "Total amount mismatch"\n- "Missing required fields"\n- "Negative amount detected"`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: errorMessagesName
        },
        select: { id: true }
    });

    const standardFieldsName = 'Invoice Standard Fields List';
    const assetStandardFields = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: invCommonAssetsPrompt.id,
                projectId: invProjectId,
                key: 'invoice-standard-fields'
            }
        },
        update: {},
        create: {
            key: 'invoice-standard-fields',
            promptId: invCommonAssetsPrompt.id,
            projectId: invProjectId
        }
    });
    const assetStandardFieldsV1 = await prisma.promptAssetVersion.upsert({
        where: {
            assetId_versionTag: {
                assetId: assetStandardFields.id,
                versionTag: 'v1.0.0'
            }
        },
        update: {
            value: `Invoice Number\nInvoice Date\nDue Date\nVendor Name\nVendor Address\nCustomer Name\nCustomer Address\nTotal Amount\nTax Amount\nLine Item Description\nLine Item Quantity\nLine Item Unit Price
Line Item Total`,
            status: 'active',
            changeMessage: standardFieldsName
        },
        create: {
            assetId: assetStandardFields.id,
            value: `Invoice Number\nInvoice Date\nDue Date\nVendor Name\nVendor Address\nCustomer Name\nCustomer Address\nTotal Amount\nTax Amount\nLine Item Description\nLine Item Quantity\nLine Item Unit Price
Line Item Total`,
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: standardFieldsName
        },
        select: { id: true }
    });

    const jsonSchemaName = 'Invoice JSON Output Schema';
    const assetJsonSchema = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: invCommonAssetsPrompt.id,
                projectId: invProjectId,
                key: 'invoice-json-schema'
            }
        },
        update: {},
        create: {
            key: 'invoice-json-schema',
            promptId: invCommonAssetsPrompt.id,
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
            changeMessage: jsonSchemaName
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
            changeMessage: jsonSchemaName
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

    // Crear traducciones es-ES para los assets y prompts
    await createSpanishTranslations(invProjectId);

    console.log(`Invoice Extraction seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });