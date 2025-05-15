import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Traducciones específicas para el proyecto de generación de código
const codegenTranslations = {
    assets: {
        'python-standard-imports': `import os
import sys
import json
import datetime
import math`,
        'python-try-except-template': `try:
    # Your code here
    pass
except Exception as e:
    print(f"An error occurred: {e}")
    # Add specific error handling or logging`,
        'python-unittest-structure': `import unittest

# Assume function_to_test is imported from your module
# from my_module import function_to_test

class TestMyFunction(unittest.TestCase):

    def test_case_1(self):
        # Arrange
        input_data = ...
        expected_output = ...
        # Act
        actual_output = function_to_test(input_data)
        # Assert
        self.assertEqual(actual_output, expected_output)

    # Add more test methods

if __name__ == '__main__':
    unittest.main()`,
    },
    prompts: {
        'generate-python-function': `Generate a Python function that performs the following task: {{Task Description}}.
            Requirements:
            - Input arguments: {{Input Arguments}}
            - Return value: {{Return Value}}
            - Include standard imports: {{python-standard-imports}}
            - Implement basic error handling using this template: {{python-try-except-template}}
            - Include type hints.
            - Add a concise docstring explaining what the function does, its arguments, and what it returns.`,
        'generate-python-unittest': `Generate a Python unit test class using the 'unittest' module for the following function:

\`\`\`python
{{Function Code}}
\`\`\`

Use this structure:
{{python-unittest-structure}}

Create test cases covering:
- {{Test Case 1 Description}}
- {{Test Case 2 Description}}
- (Optional) Edge cases: {{Edge Cases Description}}`
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
        const translation = codegenTranslations.prompts[version.prompt.id] || version.promptText;
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
        const translation = codegenTranslations.assets[version.asset.key] || version.value;
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
        select: { id: true, tenantId: true }
    });
    const tenantId = testUser.tenantId;

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
            tenant: { connect: { id: tenantId } },
        },
    });
    console.log(`Upserted Project: ${codeGenProject.name} (ID: ${cgProjectId})`);

    // Crear región es-ES y datos culturales para el proyecto CodeGen
    await createSpanishRegionAndCulturalData(codeGenProject.id);
    // Crear región en-US y datos culturales para el proyecto CodeGen
    await createUSRegionAndCulturalData(codeGenProject.id);

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

    // Crear un Prompt padre para los assets comunes de Code Generation
    const cgCommonAssetsPromptSlug = 'codegen-common-assets';
    const cgCommonAssetsPrompt = await prisma.prompt.upsert({
        where: {
            prompt_id_project_unique: {
                id: cgCommonAssetsPromptSlug,
                projectId: cgProjectId,
            },
        },
        update: { name: 'CodeGen Common Assets' },
        create: {
            id: cgCommonAssetsPromptSlug,
            name: 'CodeGen Common Assets',
            description: 'Common reusable assets for Code Generation prompts.',
            projectId: cgProjectId,
        },
        select: { id: true } // Solo necesitamos el ID para la FK
    });
    console.log(`Upserted Prompt for common CodeGen assets: ${cgCommonAssetsPrompt.id}`);

    // 2. Upsert common asset and its version
    const pythonImportsAssetName = 'Python Standard Imports';
    const assetPythonImports = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: { // NUEVA CLAVE ÚNICA
                promptId: cgCommonAssetsPrompt.id, // ID del prompt padre
                projectId: cgProjectId,     // ID del proyecto padre del prompt
                key: 'python-standard-imports'
            }
        },
        update: {
            // No hay campos actualizables para PromptAsset aquí, 'enabled' sería uno si se gestionara.
        },
        create: {
            key: 'python-standard-imports',
            promptId: cgCommonAssetsPrompt.id, // ID del prompt padre
            projectId: cgProjectId,     // ID del proyecto padre del prompt
        },
        select: { id: true } // Solo necesitamos el id para la FK de la versión
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

    // Asset: python-try-except-template
    const tryExceptAssetName = 'Python Try-Except Template';
    const assetErrorHandling = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: cgCommonAssetsPrompt.id,
                projectId: cgProjectId,
                key: 'python-try-except-template'
            }
        },
        update: {},
        create: {
            key: 'python-try-except-template',
            promptId: cgCommonAssetsPrompt.id,
            projectId: cgProjectId,
        },
        select: { id: true }
    });
    const assetErrorHandlingV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetErrorHandling.id, versionTag: 'v1.0.0' } },
        update: {
            value: codegenTranslations.assets['python-try-except-template'],
            status: 'active',
            changeMessage: tryExceptAssetName
        },
        create: {
            assetId: assetErrorHandling.id,
            value: codegenTranslations.assets['python-try-except-template'],
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: tryExceptAssetName
        },
        select: { id: true }
    });
    console.log(`Upserted common Asset: ${tryExceptAssetName} V1 (Prompt: ${cgCommonAssetsPrompt.id})`);

    // Asset: python-unittest-structure
    const unitTestStructureName = 'Python Unittest Structure';
    const assetUnitTestStructure = await prisma.promptAsset.upsert({
        where: {
            prompt_asset_key_unique: {
                promptId: cgCommonAssetsPrompt.id,
                projectId: cgProjectId,
                key: 'python-unittest-structure'
            }
        },
        update: {},
        create: {
            key: 'python-unittest-structure',
            promptId: cgCommonAssetsPrompt.id,
            projectId: cgProjectId,
        },
        select: { id: true }
    });
    const assetUnitTestStructureV1 = await prisma.promptAssetVersion.upsert({
        where: { assetId_versionTag: { assetId: assetUnitTestStructure.id, versionTag: 'v1.0.0' } },
        update: {
            value: codegenTranslations.assets['python-unittest-structure'],
            status: 'active',
            changeMessage: unitTestStructureName
        },
        create: {
            assetId: assetUnitTestStructure.id,
            value: codegenTranslations.assets['python-unittest-structure'],
            versionTag: 'v1.0.0',
            status: 'active',
            changeMessage: unitTestStructureName
        },
        select: { id: true }
    });
    console.log(`Upserted common Asset: ${unitTestStructureName} V1 (Prompt: ${cgCommonAssetsPrompt.id})`);

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

    // 4. Upsert Code Gen Prompts and Versions
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
            promptText: `Generate a Python unit test class using the 'unittest' module for the following function:

\`\`\`python
{{Function Code}}
\`\`\`

Use this structure:
{{python-unittest-structure}}

Create test cases covering:
- {{Test Case 1 Description}}
- {{Test Case 2 Description}}
- (Optional) Edge cases: {{Edge Cases Description}}`,
            status: 'active',
            activeInEnvironments: { set: [{ id: devEnvironment.id }, { id: testEnvironment.id }] },
            aiModelId: cgGpt4o.id
        },
        create: {
            promptId: promptGenTest.id,
            promptText: `Generate a Python unit test class using the 'unittest' module for the following function:

\`\`\`python
{{Function Code}}
\`\`\`

Use this structure:
{{python-unittest-structure}}

Create test cases covering:
- {{Test Case 1 Description}}
- {{Test Case 2 Description}}
- (Optional) Edge cases: {{Edge Cases Description}}`,
            versionTag: 'v1.0.0', status: 'active',
            changeMessage: 'Initial version for generating Python unit tests.',
            activeInEnvironments: { connect: [{ id: devEnvironment.id }, { id: testEnvironment.id }] },
            aiModelId: cgGpt4o.id
        },
        select: { id: true }
    });
    console.log(`Upserted Prompt ${promptGenTest.name} V1 (ID: ${promptGenTest.id})`);

    // Crear traducciones es-ES para los assets y prompts
    await createSpanishTranslations(cgProjectId);

    console.log(`Code Generation & Assistance seeding finished.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });