import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Identifier Definitions ---
const TACTIC_NAME = 'convencer-comercio-punto-kanguro';
const PROMPT_NAME = 'guillermo-llamada-captacion-comercio';
const PROMPT_VERSION_TAG = 'v1.0.0';
const ASSET_KEY_DIRECCION = 'direccion-comercio';
const ASSET_KEY_NOMBRE = 'nombre-comercio';
const ASSET_KEY_TERMINO = 'termino-punto-kanguro'; // For 'Kangúro Point'
const ASSET_VERSION_TAG = 'v1.0.0';

// --- Full Prompt Text ---
// Using template literals to maintain format and Markdown
const PROMPT_TEXT_V1 = `
Act as and introduce yourself as Guillermo from Kangúro. Your task is to convince a business to become a package pickup point for most logistics operators in Spain to increase customers, improve local visibility, and boost income at no cost.

**Reinforcement:** In each response, make sure to explicitly mention the {{${ASSET_KEY_DIRECCION}}}, the business name {{${ASSET_KEY_NOMBRE}}}, and the term {{${ASSET_KEY_TERMINO}}}.

Below are the detailed instructions:

**1. Initial Context:**
   - We are looking for a pickup point at {{${ASSET_KEY_DIRECCION}}} and want to confirm if your business {{${ASSET_KEY_NOMBRE}}} is located there.

**2. Objective:**
   - Convince the business to join Kangúro and highlight the key benefits (more customers, greater visibility, and additional income).

**3. Style and Tone:**
   - Keep the conversation fluid, natural, brief, and friendly. Be professional and approachable.

**4. Mandatory Rules:**
   a. Phone Validation:
      - Check that the number has 9 digits (Spain).
      - During dictation, respond 'Yes' when the user stops speaking.
      - If the number is incomplete, respond 'Yes' until completed. Once the number dictation is finished, repeat it digit by digit slowly and clearly for confirmation.
      - Personalize the conversation using business data (name, street, city) without being intrusive; ask who you are speaking with.
   b. Direct Approach:
      - Mention you are looking for a business at {{${ASSET_KEY_DIRECCION}}} and ask if the business {{${ASSET_KEY_NOMBRE}}} is there.
      - Briefly explain the benefits of joining Kangúro.
   c. Interaction and Response:
      - Use short sentences and simple questions to facilitate brief answers.
      - If the customer expresses doubts or is interested in additional details, offer to send information via WhatsApp or ask if they prefer further explanation, including topics like payment conditions or package specifications, only if requested.
   d. Closing:
      - Always end the conversation with 'Goodbye' to maintain a professional impression.

**5. Additional Information (explain only if asked):**
   - If the customer requests it, indicate that:
     • Payment is 20 cents per package received.
     • Package size is small (maximum the size of a shoebox).
     • There is no commitment period, and a package limit can be configured.
     • For complex questions, indicate that a human salesperson will get in touch.
     • If asked if you are a robot, confirm that you are.

**6. Next Steps:**
   - Indicate that a form will be sent via WhatsApp to proceed with the contract and point activation.

**Main Goals:**
   - Capture the business's interest.
   - Get them to agree to receive additional information.
   - Collect the WhatsApp number if necessary.
   - Leave a positive impression of Kangúro.

**AI Guidelines:**
   - Maintain a natural, friendly, and professional tone.
   - Adapt your responses based on the customer's reaction, but always focus on the benefits of Kangúro.
`;

async function main() {
    console.log(`Start seeding Kanguro prompt (${PROMPT_NAME})...`);

    // 1. Create/Update Tactic
    const tactic = await prisma.tactic.upsert({
        where: { name: TACTIC_NAME },
        update: {},
        create: {
            name: TACTIC_NAME,
        },
    });
    console.log(`Created/Updated Tactic: ${tactic.name}`);

    // 2. Create/Update Logical Prompt
    const prompt = await prisma.prompt.upsert({
        where: { name: PROMPT_NAME },
        update: {
            description: "Main prompt for Guillermo from Kangúro for business acquisition calls.",
            tacticId: tactic.name,
        },
        create: {
            name: PROMPT_NAME,
            description: "Main prompt for Guillermo from Kangúro for business acquisition calls.",
            tacticId: tactic.name,
        },
    });
    console.log(`Created/Updated Prompt: ${prompt.name}`);

    // 3. Create/Update Assets and their Versions
    const assetDireccion = await prisma.promptAsset.upsert({
        where: { key: ASSET_KEY_DIRECCION },
        update: { name: "Business Address" },
        create: {
            key: ASSET_KEY_DIRECCION,
            name: "Business Address",
            description: "Placeholder for the target business's full address.",
            type: "string",
        },
    });
    const assetVersionDireccion = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetDireccion.key, versionTag: ASSET_VERSION_TAG } },
        update: {},
        create: {
            assetId: assetDireccion.key,
            value: '{{${ASSET_KEY_DIRECCION}}}',
            versionTag: ASSET_VERSION_TAG,
        },
    });
    console.log(`Created/Updated Asset & Version: ${assetDireccion.key}(${assetVersionDireccion.id})`);

    const assetNombre = await prisma.promptAsset.upsert({
        where: { key: ASSET_KEY_NOMBRE },
        update: { name: "Business Name" },
        create: {
            key: ASSET_KEY_NOMBRE,
            name: "Business Name",
            description: "Placeholder for the target business's name.",
            type: "string",
        },
    });
    const assetVersionNombre = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetNombre.key, versionTag: ASSET_VERSION_TAG } },
        update: {},
        create: {
            assetId: assetNombre.key,
            value: '{{${ASSET_KEY_NOMBRE}}}',
            versionTag: ASSET_VERSION_TAG,
        },
    });
    console.log(`Created/Updated Asset & Version: ${assetNombre.key}(${assetVersionNombre.id})`);

    const assetTermino = await prisma.promptAsset.upsert({
        where: { key: ASSET_KEY_TERMINO },
        update: { name: "Kangúro Point Term" },
        create: {
            key: ASSET_KEY_TERMINO,
            name: "Kangúro Point Term",
            description: "The official name 'Punto Kangúro' to use.",
            type: "string",
        },
    });
    const assetVersionTermino = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetTermino.key, versionTag: ASSET_VERSION_TAG } },
        update: { value: 'Kangúro Point' },
        create: {
            assetId: assetTermino.key,
            value: 'Kangúro Point',
            versionTag: ASSET_VERSION_TAG,
        },
    });
    console.log(`Created/Updated Asset & Version: ${assetTermino.key}(${assetVersionTermino.id})`);

    // 4. Create/Update Prompt Version with Full Text
    const promptVersion = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: prompt.name, versionTag: PROMPT_VERSION_TAG } },
        update: {
            promptText: PROMPT_TEXT_V1,
        },
        create: {
            promptId: prompt.name,
            promptText: PROMPT_TEXT_V1,
            versionTag: PROMPT_VERSION_TAG,
            changeMessage: "Initial version of the Guillermo acquisition prompt.",
        },
    });
    console.log(`Created/Updated Prompt Version: ${promptVersion.versionTag} for ${prompt.name}(${promptVersion.id})`);

    // 5. Link Assets to Prompt Version
    try {
        await prisma.promptAssetLink.createMany({
            data: [
                { promptVersionId: promptVersion.id, assetVersionId: assetVersionDireccion.id, usageContext: "Reinforcement, Initial Context" },
                { promptVersionId: promptVersion.id, assetVersionId: assetVersionNombre.id, usageContext: "Reinforcement, Initial Context" },
                { promptVersionId: promptVersion.id, assetVersionId: assetVersionTermino.id, usageContext: "Reinforcement" },
            ],
        });
        console.log(`Created links between PromptVersion ${promptVersion.id} and AssetVersions.`);
    } catch (error) {
        console.error("Error creating asset links (maybe duplicates without skipDuplicates support?):", error);
    }

    console.log('Seeding Kanguro prompt finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 