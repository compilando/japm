import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

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
    const codeGenProject = await prisma.project.upsert({
        where: { id: 'dev-tools-enhancement' }, // Use ID as the unique identifier
        update: { name: 'Developer Tools AI Assistance', description: 'Prompts to help developers with common coding tasks.', ownerUserId: testUser.id },
        create: {
            id: 'dev-tools-enhancement',
            name: 'Developer Tools AI Assistance',
            description: 'Prompts to help developers with common coding tasks.',
            owner: { connect: { id: testUser.id } }, // Connect owner on create
        },
    });
    console.log(`Upserted Project: ${codeGenProject.name}`);
    const cgProjectId = codeGenProject.id;

    // 2. Upsert common asset and its version
    const assetPythonImports = await prisma.promptAsset.upsert({
        where: { key: 'python-standard-imports' },
        update: { name: 'Python Standard Imports', type: 'List', projectId: cgProjectId },
        create: { key: 'python-standard-imports', name: 'Python Standard Imports', type: 'List', projectId: cgProjectId }
    });
    const assetPythonImportsV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetPythonImports.key, versionTag: 'v1.0.0' } },
        update: { value: 'import os\nimport sys\nimport json\nimport datetime\nimport math', status: 'active' },
        create: { assetId: assetPythonImports.key, value: 'import os\nimport sys\nimport json\nimport datetime\nimport math', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true } // Select the ID for linking
    });
    console.log('Upserted common Asset: python-standard-imports V1');

    // 3. Upsert Code Gen Tags with prefix
    const cgPrefix = 'cg_';
    const cgBaseTags = ['code-generation', 'python', 'javascript', 'unit-test', 'explanation', 'refactoring', 'api-integration'];
    const cgTagMap: Map<string, string> = new Map(); // Map tagName to tagId

    for (const baseTagName of cgBaseTags) {
        const tagName = `${cgPrefix}${baseTagName}`;
        const tag = await prisma.tag.upsert({
            where: { projectId_name: { projectId: cgProjectId, name: tagName } }, // Use unique constraint
            update: {}, // No specific fields to update if it exists
            create: { name: tagName, projectId: cgProjectId },
            select: { id: true } // Select ID
        });
        cgTagMap.set(tagName, tag.id); // Store ID in map
        console.log(`Upserted Tag: ${tagName} for project ${cgProjectId}`);
    }

    // Helper function to get tag IDs from map based on base names
    const getTagIds = (baseNames: string[]): { id: string }[] => {
        return baseNames
            .map(baseName => cgTagMap.get(`${cgPrefix}${baseName}`))
            .filter((id): id is string => id !== undefined) // Filter out undefined results
            .map(id => ({ id })); // Map to Prisma connect format
    };

    // 4. Upsert Code Gen Assets (excluding the common one) and their versions
    const assetErrorHandling = await prisma.promptAsset.upsert({
        where: { key: 'python-try-except-template' },
        update: { name: 'Python Try-Except Template', type: 'Code Snippet', projectId: cgProjectId },
        create: { key: 'python-try-except-template', name: 'Python Try-Except Template', type: 'Code Snippet', projectId: cgProjectId }
    });
    const assetErrorHandlingV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetErrorHandling.key, versionTag: 'v1.0.0' } },
        update: { value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging', status: 'active' },
        create: { assetId: assetErrorHandling.key, value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });

    const assetUnitTestStructure = await prisma.promptAsset.upsert({
        where: { key: 'python-unittest-structure' },
        update: { name: 'Python Unittest Structure', type: 'Code Template', projectId: cgProjectId },
        create: { key: 'python-unittest-structure', name: 'Python Unittest Structure', type: 'Code Template', projectId: cgProjectId }
    });
    const assetUnitTestStructureV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetUnitTestStructure.key, versionTag: 'v1.0.0' } },
        update: { value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()', status: 'active' },
        create: { assetId: assetUnitTestStructure.key, value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()', versionTag: 'v1.0.0', status: 'active' },
        select: { id: true }
    });
    console.log('Upserted Code Gen Assets and V1 Versions');

    // 5. Upsert Code Gen Prompts and Versions
    const promptGenFuncName = 'generate-python-function';
    const promptGenFunc = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: cgProjectId, name: promptGenFuncName } },
        update: {
            description: 'Generate a Python function based on requirements.',
            tags: { set: getTagIds(['code-generation', 'python']) } // Use helper to get IDs
        },
        create: {
            name: promptGenFuncName,
            description: 'Generate a Python function based on requirements.',
            projectId: cgProjectId,
            tags: { connect: getTagIds(['code-generation', 'python']) } // Use helper to get IDs
        },
        select: { id: true, name: true }
    });

    const promptGenFuncV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenFunc.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate a Python function that performs the following task: {{Task Description}}.
            Requirements:
            - Input arguments: {{Input Arguments}}
            - Return value: {{Return Value}}
            - Include standard imports: {{python-standard-imports}}
            - Implement basic error handling using this template: {{python-try-except-template}}
            - Include type hints.
            - Add a concise docstring explaining what the function does, its arguments, and what it returns.`,
            status: 'active',
            activeInEnvironments: { set: [{ id: devEnvironment.id }] } // Use set for updates
        },
        create: {
            promptId: promptGenFunc.id,
            promptText: `Generate a Python function that performs the following task: {{Task Description}}.
            Requirements:
            - Input arguments: {{Input Arguments}}
            - Return value: {{Return Value}}
            - Include standard imports: {{python-standard-imports}}
            - Implement basic error handling using this template: {{python-try-except-template}}
            - Include type hints.
            - Add a concise docstring explaining what the function does, its arguments, and what it returns.`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating Python functions with error handling and imports.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }] }
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptGenFunc.name} V1`);

    // Upsert Links individually
    await prisma.promptAssetLink.upsert({
        where: { promptVersionId_assetVersionId: { promptVersionId: promptGenFuncV1.id, assetVersionId: assetPythonImportsV1.id } },
        update: { usageContext: 'Standard library imports' },
        create: { promptVersionId: promptGenFuncV1.id, assetVersionId: assetPythonImportsV1.id, usageContext: 'Standard library imports' },
    });
    await prisma.promptAssetLink.upsert({
        where: { promptVersionId_assetVersionId: { promptVersionId: promptGenFuncV1.id, assetVersionId: assetErrorHandlingV1.id } },
        update: { usageContext: 'Basic error handling structure' },
        create: { promptVersionId: promptGenFuncV1.id, assetVersionId: assetErrorHandlingV1.id, usageContext: 'Basic error handling structure' },
    });
    console.log(`Upserted links for ${promptGenFunc.name} V1`);

    const promptGenTestName = 'generate-python-unittest';
    const promptGenTest = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: cgProjectId, name: promptGenTestName } },
        update: {
            description: 'Generate a Python unit test for a given function.',
            tags: { set: getTagIds(['code-generation', 'python', 'unit-test']) } // Use helper to get IDs
        },
        create: {
            name: promptGenTestName,
            description: 'Generate a Python unit test for a given function.',
            projectId: cgProjectId,
            tags: { connect: getTagIds(['code-generation', 'python', 'unit-test']) } // Use helper to get IDs
        },
        select: { id: true, name: true }
    });

    const promptGenTestV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenTest.id, versionTag: 'v1.0.0' } },
        update: {
            promptText: `Generate a Python unit test class using the 'unittest' module for the following function:\n\n\`\`\`python\n{{Function Code}}\n\`\`\`\n\nUse this structure:\n{{python-unittest-structure}}\n\nCreate test cases covering:\n- {{Test Case 1 Description}}\n- {{Test Case 2 Description}}\n- (Optional) Edge cases: {{Edge Cases Description}}`,
            status: 'active',
            activeInEnvironments: { set: [{ id: devEnvironment.id }, { id: testEnvironment.id }] } // Use set for update
        },
        create: {
            promptId: promptGenTest.id,
            promptText: `Generate a Python unit test class using the 'unittest' module for the following function:\n\n\`\`\`python\n{{Function Code}}\n\`\`\`\n\nUse this structure:\n{{python-unittest-structure}}\n\nCreate test cases covering:\n- {{Test Case 1 Description}}\n- {{Test Case 2 Description}}\n- (Optional) Edge cases: {{Edge Cases Description}}`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating Python unit tests.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }, { id: testEnvironment.id }] }
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptGenTest.name} V1`);

    await prisma.promptAssetLink.upsert({
        where: { promptVersionId_assetVersionId: { promptVersionId: promptGenTestV1.id, assetVersionId: assetUnitTestStructureV1.id } },
        update: { usageContext: 'Unittest class template' },
        create: { promptVersionId: promptGenTestV1.id, assetVersionId: assetUnitTestStructureV1.id, usageContext: 'Unittest class template' }
    });
    console.log(`Upserted link for ${promptGenTest.name} V1`);

    console.log(`Code Generation & Assistance seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });