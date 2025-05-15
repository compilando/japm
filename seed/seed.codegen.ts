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
            asset: {
                select: {
                    key: true
                }
            }
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
        const assetKey = version.asset?.key;
        if (!assetKey) {
            console.warn(`Asset key not found for PromptAssetVersion ID: ${version.id}. Skipping translation.`);
            continue;
        }
        const translation = codegenTranslations.assets[assetKey] || version.value;
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

    // 3. Create Prompts for "Developer Tools AI Assistance" Project (cgProjectId)
    // Especificaciones para los prompts de Python
    const pythonPrompts: {
        id: string; // Usaremos esto como el slug y el ID del prompt
        name: string;
        description: string;
        promptText: string; // Texto base para la primera versión
        initialTranslations?: { languageCode: string; promptText: string }[];
        tags: string[]; // Nombres de los tags
        assets?: { key: string; name: string, initialValue: string, initialChangeMessage?: string }[]; // Assets específicos del prompt
    }[] = [
            {
                id: 'generate-python-function',
                name: 'Generate Python Function',
                description: 'Generates a Python function based on a task description, inputs, and outputs.',
                promptText: codegenTranslations.prompts['generate-python-function'],
                tags: ['python', 'code-generation', 'function'],
                assets: [
                    {
                        key: 'python-standard-imports',
                        name: 'Python Standard Imports for Function Gen',
                        initialValue: codegenTranslations.assets['python-standard-imports'],
                    },
                    {
                        key: 'python-try-except-template',
                        name: 'Python Try-Except for Function Gen',
                        initialValue: codegenTranslations.assets['python-try-except-template'],
                    }
                ]
            },
            {
                id: 'generate-python-unittest',
                name: 'Generate Python Unittest',
                description: 'Generates a Python unittest class for a given function.',
                promptText: codegenTranslations.prompts['generate-python-unittest'],
                tags: ['python', 'code-generation', 'unittest', 'testing'],
                assets: [
                    {
                        key: 'python-unittest-structure',
                        name: 'Python Unittest Structure for Test Gen',
                        initialValue: codegenTranslations.assets['python-unittest-structure'],
                    }
                ]
            },
        ];

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

    for (const promptData of pythonPrompts) {
        const promptSlug = promptData.id; // Usamos el id proporcionado como slug

        // Upsert Prompt
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptSlug, projectId: cgProjectId } },
            update: { name: promptData.name, description: promptData.description, tags: { connect: getTagIds(promptData.tags) } },
            create: {
                id: promptSlug,
                name: promptData.name,
                description: promptData.description,
                project: { connect: { id: cgProjectId } },
                tags: { connect: getTagIds(promptData.tags) },
            },
        });
        console.log(`Upserted Prompt: ${prompt.name} (ID: ${prompt.id}) in project ${cgProjectId}`);

        // Upsert Assets for this Prompt
        if (promptData.assets) {
            for (const assetInfo of promptData.assets) {
                const assetWithVersions = await prisma.promptAsset.upsert({
                    where: {
                        prompt_asset_key_unique: { // Assets are unique by key WITHIN a prompt AND project
                            promptId: prompt.id,
                            projectId: cgProjectId,
                            key: assetInfo.key,
                        }
                    },
                    update: { /* no specific asset fields to update directly here, versions handle value */ },
                    create: {
                        key: assetInfo.key,
                        promptId: prompt.id,
                        projectId: cgProjectId,
                    },
                    include: {
                        versions: {
                            select: {
                                id: true,
                                versionTag: true,
                                value: true
                            }
                            // Consider adding: where: { versionTag: 'v1.0.0' }
                            // if you only ever care about v1.0.0 at this stage.
                        }
                    }
                });

                // Ensure there's an initial version for the asset
                const initialVersion = assetWithVersions?.versions?.find(v => v.versionTag === 'v1.0.0');

                if (!initialVersion) {
                    if (assetWithVersions) { // Solo crear si el asset existe
                        await prisma.promptAssetVersion.create({
                            data: {
                                assetId: assetWithVersions.id,
                                value: assetInfo.initialValue,
                                versionTag: 'v1.0.0',
                                status: 'active',
                                changeMessage: assetInfo.initialChangeMessage || `Initial version of ${assetInfo.name}`
                            }
                        });
                        console.log(`Created initial version for asset ${assetWithVersions.key} in prompt ${prompt.id}`);
                    } else {
                        console.warn(`Asset ${assetInfo.key} was not found or created, cannot create version.`);
                    }
                } else if (initialVersion.value !== assetInfo.initialValue) {
                    await prisma.promptAssetVersion.update({
                        where: { id: initialVersion.id },
                        data: { value: assetInfo.initialValue, changeMessage: `Updated initial value for ${assetInfo.name}` }
                    });
                    console.log(`Updated initial version for asset ${assetWithVersions.key} in prompt ${prompt.id}`);
                }
            }
        }
    }

    // Crear traducciones en español para el proyecto CodeGen
    await createSpanishTranslations(cgProjectId);

    console.log(`Finished seeding Code Generation & Assistance.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });