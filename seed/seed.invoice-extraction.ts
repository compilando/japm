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
        'invoice-validation-rules': `**Protocolo Exhaustivo de Validación de Datos de Factura:**
        1.  **Unicidad e Integridad:**
            *   \`InvoiceID\`: Debe ser único dentro del sistema (requiere capacidades de verificación externa). Comprobar consistencia de formato (ej., alfanumérico, prefijos específicos).
            *   \`IssueDate\`: Debe ser una fecha válida, no futura. Debe ser anterior o igual a \`DueDate\` si ambas están presentes.
            *   \`DueDate\`: Debe ser una fecha válida.
        2.  **Exactitud Financiera:**
            *   \`LineItems\`: Para cada artículo, \`Quantity * UnitPrice\` debe coincidir aproximadamente con \`ItemTotal\` (permitir diferencias menores por redondeo, ej., +/- 0.01).
            *   \`SubtotalAmount\`: La suma de todos los \`LineItems.ItemTotal\` debe coincidir con \`SubtotalAmount\`.
            *   \`TotalAmount\`: \`SubtotalAmount\` - \`DiscountAmount\` (si existe) + Suma de todos los \`TaxDetails.TaxAmount\` debe ser igual a \`TotalAmount\`.
            *   Todos los importes monetarios (\`UnitPrice\`, \`ItemTotal\`, \`SubtotalAmount\`, \`DiscountAmount\`, \`TaxAmount\`, \`TotalAmount\`) deben ser no negativos.
        3.  **Completitud (Campos Centrales según Esquema):**
            *   Asegurar que todos los campos marcados como \'required\' en {{invoice-json-schema}} estén presentes y no sean nulos (ej., InvoiceID, IssueDate, VendorName, ClientName, TotalAmount, Currency).
        4.  **Consistencia Relacional:**
            *   Si \`TaxDetails\` están presentes, el \`TaxAmount\` para cada uno debe ser plausible dado el \`SubtotalAmount\` y \`TaxRatePercentage\`.
            *   \`Currency\`: Debe ser un código ISO 4217 válido.
        5.  **Plausibilidad (Avanzado):**
            *   \`VendorName\` / \`ClientName\`: Cotejar con listas de entidades conocidas si están disponibles.
            *   Un \`DiscountAmount\` o \`TaxAmount\` inusualmente alto podría justificar una alerta.`,
        'invoice-error-messages': `Error messages:
- "Duplicate invoice number"
- "Invalid date"
- "Total amount mismatch"
- "Missing required fields"
- "Negative amount detected"`,
        'invoice-standard-fields': `- InvoiceID (ej., INV-2023-001, #12345, Factura N°: 9876)
- IssueDate (Formato: YYYY-MM-DD, ej., Invoice Date, Fecha de Emisión)
- DueDate (Formato: YYYY-MM-DD, ej., Payment Due, Fecha de Vencimiento)
- VendorName (ej., Supplier Inc., Nombre del Proveedor)
- VendorAddress (Dirección completa del vendedor)
- VendorTaxID (Opcional, ej., VAT ID, CIF)
- ClientName (ej., Buyer Corp., Nombre del Cliente, Facturar A)
- ClientAddress (Dirección completa del comprador)
- ClientTaxID (Opcional, ej., VAT ID del cliente)
- SubtotalAmount (Total antes de impuestos y descuentos)
- DiscountAmount (Opcional, descuento total aplicado)
- TaxDetails: [ { TaxRatePercentage: numérico, TaxAmount: numérico, TaxType: texto (ej., VAT, IVA, Impuesto sobre Ventas) } ] (Array de objetos de impuesto si hay múltiples)
- TotalAmount (El importe final adeudado, ej., Grand Total, Importe Total)
- Currency (Código ISO 4217, ej., USD, EUR, GBP)
- LineItems: [ { Description: texto, Quantity: numérico, UnitPrice: numérico, ItemTotal: numérico, ProductCode: texto (opcional) } ] (Array de objetos de artículo de línea)
- PaymentInstructions (Opcional, ej., Detalles bancarios, términos de pago como "Neto 30 días")`
    },
    prompts: {
        'extract-invoice-data': `TAREA CRÍTICA: Extraer con precisión datos estructurados del texto OCR de una factura proporcionado.
Entrada OCR:
\`\`\`
{{Invoice OCR Text}}
\`\`\`

Mandato de Extracción:
1.  Identificar y extraer toda la información pertinente correspondiente a los campos detallados en el asset: {{invoice-standard-fields}}.
2.  Priorizar la exactitud, especialmente para las cifras financieras (importes, totales, impuestos) e identificadores críticos (números de factura, fechas).
3.  For dates (IssueDate, DueDate), normalize to YYYY-MM-DD format if possible. If original format is ambiguous or different, extract as found and add a note if necessary.
4.  Handle complex cases like multiple tax rates or detailed line items by populating the respective array structures as defined in the schema.
5.  If a field is genuinely absent from the invoice text, represent its value as \`null\` in the output. Do not infer or invent data.

Formato de Salida:
Strictly adhere to the JSON schema defined in the asset {{invoice-json-schema}}. Ensure the output is a single, valid JSON object.

Áreas de Enfoque Ejemplificadas:
- Distinguish clearly between Vendor and Client information.
- Correctly parse line items, including quantity, unit price, and total for each.
- Identify all components of the total amount (subtotal, discounts, taxes).`,
        'validate-invoice': `Realizar una validación meticulosa de los datos de factura extraídos que se proporcionan a continuación, cotejándolos con las exhaustivas {{invoice-validation-rules}}.

Datos de Factura Extraídos (JSON):
\`\`\`json
{{data}}
\`\`\`

Protocolo de Validación:
Ejecutar todas las comprobaciones descritas en {{invoice-validation-rules}}. Para cada posible discrepancia, proporcionar:
1.  **Campo(s) Involucrado(s):** Indicar claramente la(s) ruta(s) JSON al/a los campo(s) problemático(s).
2.  **Regla Incumplida:** Especificar el número exacto de regla y la descripción de {{invoice-validation-rules}} que se infringió.
3.  **Valor(es) Observado(s):** Mostrar los datos reales encontrados en el/los campo(s).
4.  **Valor/Condición Esperado(a):** Explicar lo que la regla esperaba.
5.  **Severidad:** (ej., Crítica, Advertencia, Información)
6.  **Suggested Action/Clarification Needed:** (ej., "Verify invoice number with issuing system", "Confirm calculation with source document", "Missing required field: ClientTaxID")

Output:
Return a structured report (e.g., an array of validation issue objects, or a clear textual summary). If no issues are found, explicitly state: "Invoice data passed all validation checks."
Use {{invoice-error-messages}} as a reference for common error phrasing if applicable, but provide specific details for each issue.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const targetLanguageCode = 'es-ES'; // Definir el idioma objetivo

    const promptVersions = await prisma.promptVersion.findMany({
        where: { prompt: { projectId: projectId } },
        // @ts-ignore // Quitar cuando languageCode esté en el tipo y en el include
        include: {
            prompt: { select: { id: true } },
            // languageCode: true // Asegúrate de que tu cliente Prisma está actualizado
        }
    });
    const promptAssetVersions = await prisma.promptAssetVersion.findMany({
        where: { asset: { prompt: { projectId: projectId } } },
        include: { asset: { select: { key: true } } }
    });
    for (const version of promptVersions) {
        // @ts-ignore // Quitar cuando languageCode esté en el tipo y en el include
        if (version.languageCode === targetLanguageCode) {
            // @ts-ignore
            console.log(`PromptVersion ${version.id} (Prompt: ${version.prompt.id}) is already in ${targetLanguageCode}. Skipping Spanish translation.`);
            continue;
        }
        // @ts-ignore
        const translationKey = version.prompt.id;
        // @ts-ignore
        const translationText = invoiceTranslations.prompts[translationKey] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: { versionId_languageCode: { versionId: version.id, languageCode: targetLanguageCode } },
            update: { promptText: translationText },
            create: { versionId: version.id, languageCode: targetLanguageCode, promptText: translationText }
        });
        // @ts-ignore
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

    const defaultLanguageCode = process.env.DEFAULT_LANGUAGE_CODE || 'en-US';
    console.log(`Using default language code: ${defaultLanguageCode}`);

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

    // 3. Upsert Prompts and their versions/assets for Invoice Extraction
    const invoiceExtractionPrompts: {
        id: string; // This will be the slug
        name: string;
        description: string;
        promptText: string;
        tags: string[];
        assets?: { key: string; initialValue: string; initialChangeMessage?: string }[]; // Name no se persiste para assets
        aiModelId?: string;
    }[] = [
            {
                id: toSlug('Extract Structured Invoice Data'),
                name: 'Extract Structured Invoice Data',
                description: 'Comprehensive prompt to extract all relevant fields from an invoice OCR text, outputting structured JSON.',
                promptText: invoiceTranslations.prompts['extract-invoice-data'], // Usar la traducción como base
                tags: ['invoice', 'data-extraction', 'ocr', 'json-output'],
                assets: [
                    { key: 'invoice-standard-fields', initialValue: invoiceTranslations.assets['invoice-standard-fields'], initialChangeMessage: 'Initial version of standard fields asset' },
                    { key: 'invoice-json-schema', initialValue: '{\"$schema\": \"http://json-schema.org/draft-07/schema#\", \"title\": \"ExtractedInvoiceData\", \"description\": \"Schema for structured data extracted from an invoice.\", \"type\": \"object\", \"properties\": {\"invoiceId\": {\"type\": [\"string\", \"null\"], \"description\": \"Unique invoice identifier.\"}, \"issueDate\": {\"type\": [\"string\", \"null\"], \"format\": \"date\", \"description\": \"Date the invoice was issued (YYYY-MM-DD).\"}, \"dueDate\": {\"type\": [\"string\", \"null\"], \"format\": \"date\", \"description\": \"Date payment is due (YYYY-MM-DD).\"}, \"vendorName\": {\"type\": [\"string\", \"null\"]}, \"vendorAddress\": {\"type\": [\"string\", \"null\"]}, \"vendorTaxId\": {\"type\": [\"string\", \"null\"]}, \"clientName\": {\"type\": [\"string\", \"null\"]}, \"clientAddress\": {\"type\": [\"string\", \"null\"]}, \"clientTaxId\": {\"type\": [\"string\", \"null\"]}, \"subtotalAmount\": {\"type\": [\"number\", \"null\"]}, \"discountAmount\": {\"type\": [\"number\", \"null\"]}, \"taxDetails\": {\"type\": \"array\", \"items\": {\"type\": \"object\", \"properties\": {\"taxRatePercentage\": {\"type\": \"number\"}, \"taxAmount\": {\"type\": \"number\"}, \"taxType\": {\"type\": \"string\"}}, \"required\": [\"taxAmount\"]}}, \"totalAmount\": {\"type\": [\"number\", \"null\"]}, \"currency\": {\"type\": [\"string\", \"null\"], \"pattern\": \"^[A-Z]{3}$\"}, \"lineItems\": {\"type\": \"array\", \"items\": {\"type\": \"object\", \"properties\": {\"description\": {\"type\": \"string\"}, \"quantity\": {\"type\": \"number\"}, \"unitPrice\": {\"type\": \"number\"}, \"itemTotal\": {\"type\": \"number\"}, \"productCode\": {\"type\": [\"string\", \"null\"]}}, \"required\": [\"description\", \"itemTotal\"]}}}, \"required\": [\"invoiceId\", \"issueDate\", \"vendorName\", \"clientName\", \"totalAmount\", \"currency\"]}}', initialChangeMessage: 'Initial version of invoice JSON schema' }
                ],
                aiModelId: invGpt4o.id
            },
            {
                id: toSlug('Validate Extracted Invoice Data'),
                name: 'Validate Extracted Invoice Data',
                description: 'Validates extracted invoice data against a set of predefined business rules.',
                promptText: invoiceTranslations.prompts['validate-invoice'], // Usar la traducción como base
                tags: ['invoice', 'validation', 'data-integrity', 'business-rules'],
                assets: [
                    { key: 'invoice-validation-rules', initialValue: invoiceTranslations.assets['invoice-validation-rules'], initialChangeMessage: 'Initial version of validation rules' },
                    { key: 'invoice-error-messages', initialValue: invoiceTranslations.assets['invoice-error-messages'], initialChangeMessage: 'Initial version of error messages' }
                ],
                aiModelId: invGpt4oMini.id // Could use a smaller model for validation logic
            }
        ];

    for (const promptSeed of invoiceExtractionPrompts) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptSeed.id, projectId: invProjectId } },
            update: {
                name: promptSeed.name,
                description: promptSeed.description,
                tags: { connect: getInvTagIds(promptSeed.tags) },
            },
            create: {
                id: promptSeed.id,
                name: promptSeed.name,
                description: promptSeed.description,
                tags: { connect: getInvTagIds(promptSeed.tags) },
                projectId: invProjectId,
            },
            select: { id: true }
        });
        console.log(`Upserted Prompt: ${promptSeed.name} (ID: ${prompt.id})`);

        if (promptSeed.assets) {
            for (const assetSeed of promptSeed.assets) {
                const asset = await prisma.promptAsset.upsert({
                    where: { prompt_asset_key_unique: { key: assetSeed.key, promptId: prompt.id, projectId: invProjectId } },
                    update: {}, // No 'name' field in PromptAsset
                    create: {
                        key: assetSeed.key,
                        promptId: prompt.id,
                        projectId: invProjectId,
                    },
                    select: { id: true }
                });

                await prisma.promptAssetVersion.upsert({
                    where: { assetId_versionTag: { assetId: asset.id, versionTag: 'v1.0.0' } },
                    update: {
                        value: assetSeed.initialValue,
                        changeMessage: assetSeed.initialChangeMessage || `Initial version for asset ${assetSeed.key}`, // No assetSeed.name
                    },
                    create: {
                        assetId: asset.id,
                        versionTag: 'v1.0.0',
                        value: assetSeed.initialValue,
                        changeMessage: assetSeed.initialChangeMessage || `Initial version for asset ${assetSeed.key}`, // No assetSeed.name
                        status: 'active',
                    },
                    select: { id: true }
                });
                console.log(`Upserted Asset & Version: ${assetSeed.key} for prompt ${promptSeed.name}`);
            }
        }

        // Create PromptVersion
        const promptVersion = await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptSeed.promptText,
                aiModelId: promptSeed.aiModelId || invGpt4o.id, // Default to invGpt4o if not specified
                status: 'active',
                changeMessage: `Initial version of ${promptSeed.name}`,
                languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
                activeInEnvironments: { set: [{ id: invDevEnv.id }, { id: invStagingEnv.id }] } // Default active environments
            },
            create: {
                promptId: prompt.id,
                promptText: promptSeed.promptText,
                versionTag: 'v1.0.0',
                aiModelId: promptSeed.aiModelId || invGpt4o.id,
                status: 'active',
                changeMessage: `Initial version of ${promptSeed.name}`,
                languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
                activeInEnvironments: { connect: [{ id: invDevEnv.id }, { id: invStagingEnv.id }] }
            },
            select: { id: true, languageCode: true } // Asegurar que se selecciona languageCode
        });
        console.log(`Upserted PromptVersion ${promptVersion.id} (Lang: ${promptVersion.languageCode}) for prompt ${promptSeed.name}`);
    }

    // Crear traducciones en español
    await createSpanishTranslations(invProjectId);

    console.log('Invoice Extraction seeding finished.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });