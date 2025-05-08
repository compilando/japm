import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData } from './helpers';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Función slugify (igual que en los servicios)
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Code Generation & Assistance...`);
    console.log('Assuming base seed (user, envs, models, regions) already ran...');

    // --- Find necessary base data --- 
    // Find test user (should exist)
    const testUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test@example.com' },
        select: { id: true }
    });

    // Find relevant environment (should exist from default project)
    const defaultProjectId = 'default-project'; // ID del proyecto donde buscar los entornos base
    const devEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { projectId: defaultProjectId, name: 'development' } },
        select: { id: true }
    });
    const testEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { projectId_name: { projectId: defaultProjectId, name: 'testing' } },
        select: { id: true }
    });

    // --- Create Project Specific Data ---
    // 1. Upsert Code Gen Project
    const codeGenProjectName = 'Developer Tools AI Assistance';
    const cgProjectId = slugify(codeGenProjectName); // ID es slug del nombre
    const codeGenProject = await prisma.project.upsert({
        where: { id: cgProjectId },
        update: { name: codeGenProjectName, description: 'Prompts to help developers with common coding tasks.', ownerUserId: testUser.id },
        create: {
            id: cgProjectId,
            name: codeGenProjectName,
            description: 'Prompts to help developers with common coding tasks.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Upserted Project: ${codeGenProject.name} (ID: ${cgProjectId})`);

    // Crear región es-ES y datos culturales para el proyecto CodeGen
    await createSpanishRegionAndCulturalData(codeGenProject.id);

    // Create specific AI models for this project
    const cgGpt4o = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: cgProjectId, name: 'gpt-4o-2024-05-13' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        create: { projectId: cgProjectId, name: 'gpt-4o-2024-05-13', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.5 },
        select: { id: true }
    });
    const cgGpt4oMini = await prisma.aIModel.upsert({
        where: { projectId_name: { projectId: cgProjectId, name: 'gpt-4o-mini-2024-07-18' } },
        update: { provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        create: { projectId: cgProjectId, name: 'gpt-4o-mini-2024-07-18', provider: 'OpenAI', apiKeyEnvVar: 'OPENAI_API_KEY', temperature: 0.7 },
        select: { id: true }
    });
    console.log(`Upserted AI Models for project ${cgProjectId}`);

    // 2. Upsert common asset and its version
    const pythonImportsAssetName = 'Python Standard Imports';
    const assetPythonImports = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: { // Corregido
                projectId: cgProjectId,
                key: 'python-standard-imports'
            }
        },
        update: { /* name eliminado */ },
        create: {
            key: 'python-standard-imports',
            // name eliminado
            projectId: cgProjectId
        },
        // select eliminado o ajustado si no se necesita el resultado inmediato más que el id
    });
    const assetPythonImportsV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetPythonImports.id, versionTag: 'v1.0.0' } },
        update: {
            value: 'import os\nimport sys\nimport json\nimport datetime\nimport math',
            status: 'active',
            changeMessage: pythonImportsAssetName // Añadido
        },
        create: {
            assetId: assetPythonImports.id,
            value: 'import os\nimport sys\nimport json\nimport datetime\nimport math',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: pythonImportsAssetName // Añadido
        },
        select: { id: true }
    });
    console.log(`Upserted common Asset: ${pythonImportsAssetName} V1`);

    // 3. Upsert Code Gen Tags with prefix
    const cgPrefix = 'cg_';
    const cgBaseTags = ['code-generation', 'python', 'javascript', 'unit-test', 'explanation', 'refactoring', 'api-integration'];
    const cgTagMap: Map<string, string> = new Map();
    for (const baseTagName of cgBaseTags) {
        const tagName = `${cgPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: cgProjectId, name: tagName } },
            update: {},
            create: { name: tagName, projectId: cgProjectId },
            select: { id: true }
        });
        cgTagMap.set(tagName, tag.id);
        console.log(`Upserted Tag: ${tagName} for project ${cgProjectId}`);
    }
    const getTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => cgTagMap.get(`${cgPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined)
            .map(id => ({ id }));
    };

    // 4. Upsert Code Gen Assets (excluding the common one) and their versions
    const errorHandlingAssetName = 'Python Try-Except Template'; // Guardar nombre
    const assetErrorHandling = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: { projectId: cgProjectId, key: 'python-try-except-template' } // Corregido
        },
        update: { /* name eliminado */ },
        create: {
            key: 'python-try-except-template',
            // name eliminado
            projectId: cgProjectId
        }
    });
    const assetErrorHandlingV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetErrorHandling.id, versionTag: 'v1.0.0' } },
        update: {
            value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging',
            status: 'active',
            changeMessage: errorHandlingAssetName // Añadido
        },
        create: {
            assetId: assetErrorHandling.id,
            value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: errorHandlingAssetName // Añadido
        },
        select: { id: true }
    });

    const unitTestStructureAssetName = 'Python Unittest Structure'; // Guardar nombre
    const assetUnitTestStructure = await prisma.promptAsset.upsert({
        where: {
            project_asset_key_unique: { projectId: cgProjectId, key: 'python-unittest-structure' } // Corregido
        },
        update: { /* name eliminado */ },
        create: {
            key: 'python-unittest-structure',
            // name eliminado
            projectId: cgProjectId
        }
    });
    const assetUnitTestStructureV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetUnitTestStructure.id, versionTag: 'v1.0.0' } },
        update: {
            value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()',
            status: 'active',
            changeMessage: unitTestStructureAssetName // Añadido
        },
        create: {
            assetId: assetUnitTestStructure.id,
            value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()',
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: unitTestStructureAssetName // Añadido
        },
        select: { id: true }
    });
    console.log(`Upserted Code Gen Assets and V1 Versions`); // Este log es genérico para los dos

    // 5. Upsert Code Gen Prompts and Versions
    const promptGenFuncName = 'generate-python-function';
    const promptGenFuncSlug = slugify(promptGenFuncName); // Este es el ID ahora
    const promptGenFunc = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: { // Usar el nombre definido en @@unique
                id: promptGenFuncSlug,
                projectId: cgProjectId
            }
        },
        update: {
            name: promptGenFuncName,
            description: 'Generate a Python function based on requirements.',
            tags: { set: getTagIds(['code-generation', 'python']) }
        },
        create: {
            id: promptGenFuncSlug,
            name: promptGenFuncName,
            description: 'Generate a Python function based on requirements.',
            projectId: cgProjectId,
            tags: { connect: getTagIds(['code-generation', 'python']) }
        },
        select: { id: true, name: true }
    });

    // Upsert de PromptVersion usa promptGenFunc.id que ahora es el slug (ID del Prompt)
    const promptGenFuncV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenFunc.id, versionTag: 'v1.0.0' } }, // promptId es el slug/ID del Prompt
        update: {
            promptText: `Generate a Python function that performs the following task: {{Task Description}}.\n            Requirements:\n            - Input arguments: {{Input Arguments}}\n            - Return value: {{Return Value}}\n            - Include standard imports: {{python-standard-imports}}\n            - Implement basic error handling using this template: {{python-try-except-template}}\n            - Include type hints.\n            - Add a concise docstring explaining what the function does, its arguments, and what it returns.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: devEnvironment.id }] },
            aiModelId: cgGpt4o.id
        },
        create: {
            promptId: promptGenFunc.id,
            promptText: `Generate a Python function that performs the following task: {{Task Description}}.\\n            Requirements:\\n            - Input arguments: {{Input Arguments}}\\n            - Return value: {{Return Value}}\\n            - Include standard imports: {{python-standard-imports}}\\n            - Implement basic error handling using this template: {{python-try-except-template}}\\n            - Include type hints.\\n            - Add a concise docstring explaining what the function does, its arguments, and what it returns.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating Python functions with error handling and imports.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }] },
            aiModelId: cgGpt4o.id
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptGenFunc.name} V1 (ID: ${promptGenFunc.id})`);

    const promptGenTestName = 'generate-python-unittest';
    const promptGenTestSlug = slugify(promptGenTestName); // Este es el ID ahora
    const promptGenTest = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: { // Usar el nombre definido en @@unique
                id: promptGenTestSlug,
                projectId: cgProjectId
            }
        },
        update: {
            name: promptGenTestName,
            description: 'Generate a Python unit test for a given function.',
            tags: { set: getTagIds(['code-generation', 'python', 'unit-test']) }
        },
        create: {
            id: promptGenTestSlug,
            name: promptGenTestName,
            description: 'Generate a Python unit test for a given function.',
            projectId: cgProjectId,
            tags: { connect: getTagIds(['code-generation', 'python', 'unit-test']) }
        },
        select: { id: true, name: true }
    });

    // Upsert de PromptVersion usa promptGenTest.id que ahora es el slug (ID del Prompt)
    const promptGenTestV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenTest.id, versionTag: 'v1.0.0' } }, // promptId es el slug/ID del Prompt
        update: {
            promptText: `Generate a Python unit test class using the \'unittest\' module for the following function:\\n\\n\\\`\\\`\\\`python\\n{{Function Code}}\\n\\\`\\\`\\\`\\n\\nUse this structure:\\n{{python-unittest-structure}}\\n\\nCreate test cases covering:\\n- {{Test Case 1 Description}}\\n- {{Test Case 2 Description}}\\n- (Optional) Edge cases: {{Edge Cases Description}}`,
            status: 'active',
            activeInEnvironments: { set: [{ id: devEnvironment.id }, { id: testEnvironment.id }] },
            aiModelId: cgGpt4o.id
        },
        create: {
            promptId: promptGenTest.id,
            promptText: `Generate a Python unit test class using the \'unittest\' module for the following function:\\n\\n\\\`\\\`\\\`python\\n{{Function Code}}\\n\\\`\\\`\\\`\\n\\nUse this structure:\\n{{python-unittest-structure}}\\n\\nCreate test cases covering:\\n- {{Test Case 1 Description}}\\n- {{Test Case 2 Description}}\\n- (Optional) Edge cases: {{Edge Cases Description}}`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating Python unit tests.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }, { id: testEnvironment.id }] },
            aiModelId: cgGpt4o.id
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptGenTest.name} V1 (ID: ${promptGenTest.id})`);

    console.log(`Code Generation & Assistance seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });