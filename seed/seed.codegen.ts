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
        select: { id: true }
    });
    const testEnvironment = await prisma.environment.findUniqueOrThrow({
        where: { name: 'testing' },
        select: { id: true }
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
    console.log(`Created Project: ${codeGenProject.name}`);
    const cgProjectId = codeGenProject.id;

    // Now create the common asset and connect it to the project
    const assetPythonImports = await prisma.promptAsset.upsert({
        where: { key: 'python-standard-imports' },
        update: { name: 'Python Standard Imports', type: 'List', projectId: cgProjectId },
        create: { key: 'python-standard-imports', name: 'Python Standard Imports', type: 'List', projectId: cgProjectId }
    });
    const assetPythonImportsV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetPythonImports.key, versionTag: 'v1.0.0' } },
        update: { value: 'import os\\nimport sys\\nimport json\\nimport datetime\\nimport math', status: 'active' }, // Add actual standard imports here
        create: { asset: { connect: { key: assetPythonImports.key } }, value: 'import os\\nimport sys\\nimport json\\nimport datetime\\nimport math', versionTag: 'v1.0.0', status: 'active' }, // Add actual standard imports here
        select: { id: true } // Select the ID as it's needed later
    });
    console.log('Upserted common Asset: python-standard-imports V1');

    // 2. Create Code Gen Tags with prefix
    const cgPrefix = 'cg_';
    const cgBaseTags = ['code-generation', 'python', 'javascript', 'unit-test', 'explanation', 'refactoring', 'api-integration'];
    const cgTagsToConnect: { name: string }[] = [];

    for (const baseTagName of cgBaseTags) {
        const tagName = `${cgPrefix}${baseTagName}`;
        const existingTag = await prisma.tag.findUnique({ where: { name: tagName } });

        if (existingTag) {
            if (existingTag.projectId !== cgProjectId) {
                await prisma.tag.update({ where: { id: existingTag.id }, data: { projectId: cgProjectId } });
                console.log(`Updated Tag: ${tagName} project link to ${cgProjectId}`);
            }
        } else {
            await prisma.tag.create({ data: { name: tagName, projectId: cgProjectId } });
            console.log(`Created Tag: ${tagName} for project ${cgProjectId}`);
        }
        cgTagsToConnect.push({ name: tagName });
    }

    // 3. Create Code Gen Assets (excluding the common one)
    const assetErrorHandling = await prisma.promptAsset.upsert({
        where: { key: 'python-try-except-template' },
        update: { name: 'Python Try-Except Template', type: 'Code Snippet', projectId: cgProjectId },
        create: { key: 'python-try-except-template', name: 'Python Try-Except Template', type: 'Code Snippet', projectId: cgProjectId }
    });
    const assetErrorHandlingV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetErrorHandling.key, versionTag: 'v1.0.0' } },
        update: { value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging', status: 'active' },
        create: { asset: { connect: { key: assetErrorHandling.key } }, value: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"An error occurred: {e}")\n    # Add specific error handling or logging', versionTag: 'v1.0.0', status: 'active' }
    });

    const assetUnitTestStructure = await prisma.promptAsset.upsert({
        where: { key: 'python-unittest-structure' },
        update: { name: 'Python Unittest Structure', type: 'Code Template', projectId: cgProjectId },
        create: { key: 'python-unittest-structure', name: 'Python Unittest Structure', type: 'Code Template', projectId: cgProjectId }
    });
    const assetUnitTestStructureV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetUnitTestStructure.key, versionTag: 'v1.0.0' } },
        update: { value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()', status: 'active' },
        create: { asset: { connect: { key: assetUnitTestStructure.key } }, value: 'import unittest\n\n# Assume function_to_test is imported from your module\n# from my_module import function_to_test\n\nclass TestMyFunction(unittest.TestCase):\n\n    def test_case_1(self):\n        # Arrange\n        input_data = ...\n        expected_output = ...\n        # Act\n        actual_output = function_to_test(input_data)\n        # Assert\n        self.assertEqual(actual_output, expected_output)\n\n    # Add more test methods\n\nif __name__ == \'__main__\':\n    unittest.main()', versionTag: 'v1.0.0', status: 'active' }
    });
    console.log('Upserted Code Gen Assets and V1 Versions');

    // 4. Create Code Gen Prompts and Versions
    const promptGenFuncName = 'generate-python-function';
    const promptGenFunc = await prisma.prompt.upsert({
        where: { projectId_name: { projectId: cgProjectId, name: promptGenFuncName } },
        update: {
            description: 'Generate a Python function based on requirements.',
            tags: { connect: cgTagsToConnect.filter(t => ['cg_code-generation', 'cg_python'].includes(t.name)) }
        },
        create: {
            id: undefined,
            name: promptGenFuncName,
            description: 'Generate a Python function based on requirements.',
            projectId: cgProjectId,
            tags: { connect: cgTagsToConnect.filter(t => ['cg_code-generation', 'cg_python'].includes(t.name)) }
        },
        select: { id: true, name: true }
    });

    const promptGenFuncV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenFunc.id, versionTag: 'v1.0.0' } },
        update: { status: 'active', activeInEnvironments: { connect: [{ id: devEnvironment.id }] } },
        create: {
            prompt: { connect: { id: promptGenFunc.id } },
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
            tags: { connect: cgTagsToConnect.filter(t => ['cg_code-generation', 'cg_python', 'cg_unit-test'].includes(t.name)) }
        },
        create: {
            id: undefined,
            name: promptGenTestName,
            description: 'Generate a Python unit test for a given function.',
            projectId: cgProjectId,
            tags: { connect: cgTagsToConnect.filter(t => ['cg_code-generation', 'cg_python', 'cg_unit-test'].includes(t.name)) }
        },
        select: { id: true, name: true }
    });

    const promptGenTestV1 = await prisma.promptVersion.upsert({
        where: { promptId_versionTag: { promptId: promptGenTest.id, versionTag: 'v1.0.0' } },
        update: { status: 'active', activeInEnvironments: { connect: [{ id: devEnvironment.id }, { id: testEnvironment.id }] } },
        create: {
            prompt: { connect: { id: promptGenTest.id } },
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