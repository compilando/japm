import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
    console.log(`-----------------------------------`);
    console.log(`Start seeding for Code Generation & Assistance...`);
    console.log('Assuming base seed (user, envs, models, regions) already ran...');

    // --- Find necessary base data --- 
    // Find test user (should exist from seed.ts)
    const testUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test@example.com' },
        select: { id: true }
    });

    // Find relevant environment (should exist from seed.ts)
    const devEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { name: 'development' },
        select: { name: true }
    });
    const testEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { name: 'testing' },
        select: { name: true }
    });

    // --- Create Project Specific Data ---
    // 1. Create Code Gen Project FIRST as assets depend on it
    const codeGenProject = await prisma.project.upsert({
        where: { id: 'dev-tools-enhancement' },
        update: { name: 'Developer Tools AI Assistance', description: 'Prompts to help developers with common coding tasks.', ownerUserId: testUser.id },
        create: {
            id: 'dev-tools-enhancement',
            name: 'Developer Tools AI Assistance',
            description: 'Prompts to help developers with common coding tasks.',
            owner: { connect: { id: testUser.id } },
        },
    });
    console.log(`Upserted Project: ${codeGenProject.name}`);

    // Now create the common asset and connect it to the project
    const assetPythonImports = await prisma.promptAsset.upsert({
        where: { key: 'python-standard-imports' },
        update: { name: 'Python Standard Imports', type: 'List', project: { connect: { id: codeGenProject.id } } }, // Connect to the created project
        create: { key: 'python-standard-imports', name: 'Python Standard Imports', type: 'List', project: { connect: { id: codeGenProject.id } } } // Connect to the created project
    });
    const assetPythonImportsV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetPythonImports.key, versionTag: 'v1.0.0' } },
        update: { value: 'import os\\nimport sys\\nimport json\\nimport datetime\\nimport math', status: 'active' }, // Add actual standard imports here
        create: { asset: { connect: { key: assetPythonImports.key } }, value: 'import os\\nimport sys\\nimport json\\nimport datetime\\nimport math', versionTag: 'v1.0.0', status: 'active' }, // Add actual standard imports here
        select: { id: true } // Select the ID as it's needed later
    });
    console.log('Upserted common Asset: python-standard-imports V1');

    // 2. Create Code Gen Tags
    const codeGenTags = ['code-generation', 'python', 'javascript', 'unit-test', 'explanation', 'refactoring', 'api-integration'];
    for (const tagName of codeGenTags) {
        await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
        console.log(`Upserted Tag: ${tagName}`);
    }

    // 3. Create Code Gen Assets (excluding the common one)
    const assetErrorHandling = await prisma.promptAsset.upsert({
        where: { key: 'python-try-except-template' },
        update: { name: 'Python Try-Except Template', type: 'Code Snippet', project: { connect: { id: codeGenProject.id } } },
        create: { key: 'python-try-except-template', name: 'Python Try-Except Template', type: 'Code Snippet', project: { connect: { id: codeGenProject.id } } }
    });
    const assetErrorHandlingV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetErrorHandling.key, versionTag: 'v1.0.0' } },
        update: { value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging', status: 'active' },
        create: { asset: { connect: { key: assetErrorHandling.key } }, value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging', versionTag: 'v1.0.0', status: 'active' }
    });

    const assetUnitTestStructure = await prisma.promptAsset.upsert({
        where: { key: 'python-unittest-structure' },
        update: { name: 'Python Unittest Structure', type: 'Code Template', project: { connect: { id: codeGenProject.id } } },
        create: { key: 'python-unittest-structure', name: 'Python Unittest Structure', type: 'Code Template', project: { connect: { id: codeGenProject.id } } }
    });
    const assetUnitTestStructureV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetUnitTestStructure.key, versionTag: 'v1.0.0' } },
        update: { value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()', status: 'active' },
        create: { asset: { connect: { key: assetUnitTestStructure.key } }, value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()', versionTag: 'v1.0.0', status: 'active' }
    });
    console.log('Upserted Code Gen Assets and V1 Versions');

    // 4. Create Code Gen Prompts and Versions
    const promptGenFunc = await prisma.prompt.upsert({
        where: { name: 'generate-python-function' },
        update: { description: 'Generate a Python function based on requirements.', project: { connect: { id: codeGenProject.id } }, tags: { connect: [{ name: 'code-generation' }, { name: 'python' }] } },
        create: {
            name: 'generate-python-function',
            description: 'Generate a Python function based on requirements.',
            project: { connect: { id: codeGenProject.id } },
            tags: { connect: [{ name: 'code-generation' }, { name: 'python' }] }
        }
    });

    const promptGenFuncV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenFunc.name, versionTag: 'v1.0.0' } },
        update: { status: 'active', activeInEnvironments: { connect: [{ name: devEnvironment.name }] } }, // Ensure env connection is updated
        create: {
            prompt: { connect: { name: promptGenFunc.name } },
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
            activeInEnvironments: { connect: [{ name: devEnvironment.name }] } // Connect to dev env
        }
    });
    console.log(`Upserted Prompt ${promptGenFunc.name} V1`);

    // Link assets using upsert
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

    const promptGenTest = await prisma.prompt.upsert({
        where: { name: 'generate-python-unittest' },
        update: { description: 'Generate a Python unit test for a given function.', project: { connect: { id: codeGenProject.id } }, tags: { connect: [{ name: 'code-generation' }, { name: 'python' }, { name: 'unit-test' }] } },
        create: {
            name: 'generate-python-unittest',
            description: 'Generate a Python unit test for a given function.',
            project: { connect: { id: codeGenProject.id } },
            tags: { connect: [{ name: 'code-generation' }, { name: 'python' }, { name: 'unit-test' }] }
        }
    });

    const promptGenTestV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenTest.name, versionTag: 'v1.0.0' } },
        update: { status: 'active', activeInEnvironments: { connect: [{ name: devEnvironment.name }, { name: testEnvironment.name }] } },
        create: {
            prompt: { connect: { name: promptGenTest.name } },
            promptText: `Generate a Python unit test class using the 'unittest' module for the following function:\n\n\`\`\`python\n{{Function Code}}\n\`\`\`\n\nUse this structure:\n{{python-unittest-structure}}\n\nCreate test cases covering:\n- {{Test Case 1 Description}}\n- {{Test Case 2 Description}}\n- (Optional) Edge cases: {{Edge Cases Description}}`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating Python unit tests.',
            activeInEnvironments: { connect: [{ name: devEnvironment.name }, { name: testEnvironment.name }] } // Connect to dev and test envs
        }
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