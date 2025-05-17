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
                id: toSlug('extract-invoice-data'),
                name: 'Precise Invoice Data Extraction',
                description: 'Performs high-accuracy extraction of structured data from OCR invoice text, adhering to a detailed field list and JSON schema.',
                promptText: `CRITICAL TASK: Accurately extract structured data from the provided OCR text of an invoice.
OCR Input:
\`\`\`
{{Invoice OCR Text}}
\`\`\`

Extraction Mandate:
1.  Identify and extract all pertinent information corresponding to the fields detailed in the asset: {{invoice-standard-fields}}.
2.  Prioritize accuracy, especially for financial figures (amounts, totals, taxes) and critical identifiers (invoice numbers, dates).
3.  For dates (IssueDate, DueDate), normalize to YYYY-MM-DD format if possible. If original format is ambiguous or different, extract as found and add a note if necessary.
4.  Handle complex cases like multiple tax rates or detailed line items by populating the respective array structures as defined in the schema.
5.  If a field is genuinely absent from the invoice text, represent its value as \`null\` in the output. Do not infer or invent data.

Output Format:
Strictly adhere to the JSON schema defined in the asset {{invoice-json-schema}}. Ensure the output is a single, valid JSON object.

Example Focus Areas:
- Distinguish clearly between Vendor and Client information.
- Correctly parse line items, including quantity, unit price, and total for each.
- Identify all components of the total amount (subtotal, discounts, taxes).`,
                tags: ['data-extraction', 'ocr', 'json-output', 'invoice-processing', 'accuracy-focused'],
                assets: [
                    {
                        key: 'invoice-standard-fields',
                        name: 'Comprehensive Invoice Field Definitions & Examples',
                        initialValue: `- InvoiceID (e.g., INV-2023-001, #12345, Factura N°: 9876)
- IssueDate (Format: YYYY-MM-DD, e.g., Invoice Date, Fecha de Emisión)
- DueDate (Format: YYYY-MM-DD, e.g., Payment Due, Fecha de Vencimiento)
- VendorName (e.g., Supplier Inc., Nombre del Proveedor)
- VendorAddress (Full address of the seller)
- VendorTaxID (Optional, e.g., VAT ID, CIF)
- ClientName (e.g., Buyer Corp., Nombre del Cliente, Bill To)
- ClientAddress (Full address of the buyer)
- ClientTaxID (Optional, e.g., Customer VAT ID)
- SubtotalAmount (Total before taxes and discounts)
- DiscountAmount (Optional, total discount applied)
- TaxDetails: [ { TaxRatePercentage: number, TaxAmount: number, TaxType: string (e.g., VAT, IVA, Sales Tax) } ] (Array of tax objects if multiple)
- TotalAmount (The final amount due, e.g., Grand Total, Importe Total)
- Currency (ISO 4217 code, e.g., USD, EUR, GBP)
- LineItems: [ { Description: string, Quantity: number, UnitPrice: number, ItemTotal: number, ProductCode: string (optional) } ] (Array of line item objects)
- PaymentInstructions (Optional, e.g., Bank details, payment terms like "Net 30")`
                    },
                    {
                        key: 'invoice-json-schema',
                        name: 'Detailed Invoice JSON Output Schema',
                        initialValue: `{
  "type": "object",
  "properties": {
    "InvoiceID": { "type": ["string", "null"], "description": "Unique invoice identifier (e.g., INV-2023-001, #12345) }
    "IssueDate": { "type": ["string", "null"], "format": "date", "description": "Date of issue (YYYY-MM-DD) }
    "DueDate": { "type": ["string", "null"], "format": "date", "description": "Payment due date (YYYY-MM-DD) }
    "VendorName": { "type": ["string", "null"] }
    "VendorAddress": { "type": ["string", "null"] }
    "VendorTaxID": { "type": ["string", "null"] }
    "ClientName": { "type": ["string", "null"] }
    "ClientAddress": { "type": ["string", "null"] }
    "ClientTaxID": { "type": ["string", "null"] }
    "SubtotalAmount": { "type": ["number", "null"] }
    "DiscountAmount": { "type": ["number", "null"] }
    "TaxDetails": {
      "type": ["array", "null"],
      "items": {
        "type": "object",
        "properties": {
          "TaxRatePercentage": { "type": ["number", "null"] }
          "TaxAmount": { "type": ["number", "null"] }
          "TaxType": { "type": ["string", "null"] }
        },
        "required": ["TaxAmount"]
      }
    },
    "TotalAmount": { "type": ["number", "null"] }
    "Currency": { "type": ["string", "null"], "pattern": "^[A-Z]{3}$" }
    "LineItems": {
      "type": ["array", "null"],
      "items": {
        "type": "object",
        "properties": {
          "Description": { "type": ["string", "null"] }
          "Quantity": { "type": ["number", "null"] }
          "UnitPrice": { "type": ["number", "null"] }
          "ItemTotal": { "type": ["number", "null"] }
          "ProductCode": { "type": ["string", "null"] }
        },
        "required": ["Description", "ItemTotal"]
      }
    },
    "PaymentInstructions": { "type": ["string", "null"] }
  },
  "required": ["InvoiceID", "IssueDate", "VendorName", "ClientName", "TotalAmount", "Currency"]
}`
                    }
                ],
                aiModelId: invGpt4o.id,
                activeInEnvironments: [{ id: invDevEnv.id }, { id: invStagingEnv.id }]
            },
            {
                id: toSlug('validate-invoice'),
                name: 'Meticulous Invoice Data Validation',
                description: 'Performs a meticulous validation of extracted invoice data against a comprehensive set of rules, providing a structured report of any discrepancies.',
                promptText: `Perform a meticulous validation of the extracted invoice data provided below, cross-referencing against the comprehensive {{invoice-validation-rules}}.

Extracted Invoice Data (JSON):
\`\`\`json
{{data}}
\`\`\`

Validation Protocol:
Execute all checks outlined in {{invoice-validation-rules}}. For each potential discrepancy, provide:
1.  **Field(s) Involved:** Clearly state the JSON path(s) to the problematic field(s).
2.  **Rule Violated:** Specify the exact rule number and description from {{invoice-validation-rules}} that was breached.
3.  **Observed Value(s):** Show the actual data found in the field(s).
4.  **Expected Value/Condition:** Explain what the rule expected.
5.  **Severity:** (e.g., Critical, Warning, Info)
6.  **Suggested Action/Clarification Needed:** (e.g., "Verify invoice number with issuing system", "Confirm calculation with source document", "Missing required field: ClientTaxID")

Output:
Return a structured report (e.g., an array of validation issue objects, or a clear textual summary). If no issues are found, explicitly state: "Invoice data passed all validation checks."
Use {{invoice-error-messages}} as a reference for common error phrasing if applicable, but provide specific details for each issue.`,
                tags: ['data-extraction', 'validation', 'invoice-processing', 'data-integrity', 'quality-assurance'],
                assets: [
                    {
                        key: 'invoice-validation-rules',
                        name: 'Comprehensive Invoice Validation Protocol',
                        initialValue: `**Comprehensive Invoice Data Validation Protocol:**
1.  **Uniqueness & Integrity:**
    *   \`InvoiceID\`: Must be unique within the system (requires external check capabilities). Format consistency check (e.g., alphanumeric, specific prefixes).
    *   \`IssueDate\`: Must be a valid date, not in the future. Must be before or same as \`DueDate\` if both present.
    *   \`DueDate\`: Must be a valid date.
2.  **Financial Accuracy:**
    *   \`LineItems\`: For each item, \`Quantity * UnitPrice\` should closely match \`ItemTotal\` (allow for minor rounding differences, e.g., +/- 0.01).
    *   \`SubtotalAmount\`: Sum of all \`LineItems.ItemTotal\` should match \`SubtotalAmount\`.
    *   \`TotalAmount\`: \`SubtotalAmount\` - \`DiscountAmount\` (if present) + Sum of all \`TaxDetails.TaxAmount\` should equal \`TotalAmount\`.
    *   All monetary amounts (\`UnitPrice\`, \`ItemTotal\`, \`SubtotalAmount\`, \`DiscountAmount\`, \`TaxAmount\`, \`TotalAmount\`) must be non-negative.
3.  **Completeness (Core Fields based on Schema):**
    *   Ensure all fields marked as \'required\' in {{invoice-json-schema}} are present and not null (e.g., InvoiceID, IssueDate, VendorName, ClientName, TotalAmount, Currency).
4.  **Relational Consistency:**
    *   If \`TaxDetails\` are present, \`TaxAmount\` for each should be plausible given \`SubtotalAmount\` and \`TaxRatePercentage\`.
    *   \`Currency\`: Must be a valid ISO 4217 code.
5.  **Plausibility (Advanced):**
    *   \`VendorName\` / \`ClientName\`: Check against known entity lists if available.
    *   Unusually high \`DiscountAmount\` or \`TaxAmount\` might warrant a flag.`
                    },
                    {
                        key: 'invoice-error-messages',
                        name: 'Standardized Invoice Error Message Templates',
                        initialValue: `Error messages:
- "[Critical] Duplicate Invoice ID: {{InvoiceID}} already exists in system."
- "[Error] Invalid IssueDate: {{IssueDate}} is in the future or invalid format."
- "[Error] DueDate {{DueDate}} cannot be before IssueDate {{IssueDate}}."
- "[Warning] Line Item Discrepancy (Item: {{ItemDescription}}): Calculated total {{CalcTotal}} does not match reported ItemTotal {{ItemTotal}}."
- "[Error] Subtotal Mismatch: Sum of line items {{SumLineItems}} does not match SubtotalAmount {{SubtotalAmount}}."
- "[Critical] Grand Total Mismatch: Calculated grand total {{CalcGrandTotal}} does not match reported TotalAmount {{TotalAmount}}."
- "[Error] Missing Required Field: {{FieldName}}."
- "[Error] Negative Monetary Amount: {{FieldName}} has value {{FieldValue}}."
- "[Warning] Currency code {{Currency}} might be invalid or non-standard."
- "[Info] Payment term '{{Term}}' extracted. Requires verification if unusual."`
                    }
                ],
                aiModelId: invGpt4oMini.id,
                activeInEnvironments: [{ id: invDevEnv.id }, { id: invStagingEnv.id }]
            }
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