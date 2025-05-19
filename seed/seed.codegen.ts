import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Traducciones específicas para el proyecto de generación de código
const codegenTranslations = {
    assets: {
        'python-standard-imports': `# Importaciones de la biblioteca estándar de Python
import os
import sys
import json
import datetime
import math
import logging
import re
import collections
import functools
import itertools
from pathlib import Path
from typing import Any, List, Dict, Tuple, Optional, Union, Callable

# Configurar logging básico (opcional, puede ser personalizado por el usuario)
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')`,
        'python-try-except-template': `try:
    # --- Su lógica principal aquí ---
    # Ejemplo: resultado = operacion_arriesgada()
    pass # Reemplace con su código
except FileNotFoundError as fnf_error:
    logging.error(f"Error: Archivo requerido no encontrado - {fnf_error}")
    # Opcionalmente, relanzar o devolver un código/mensaje de error específico
    # raise
except ValueError as val_error:
    logging.error(f"Error: Se encontró un valor inválido - {val_error}")
    # Manejar errores de valor específicos
except TypeError as type_error:
    logging.error(f"Error: Discrepancia de tipos - {type_error}")
    # Manejar errores de tipo específicos
except Exception as e:
    logging.exception(f"Ocurrió un error inesperado: {e}") # logging.exception incluye el rastreo de pila
    # Fallback general, considere relanzar o manejo específico
    # raise CustomApplicationError(f"La operación falló debido a: {e}") from e
else:
    # Código a ejecutar si el bloque try se completa con éxito (sin excepciones)
    # print("Operación completada exitosamente.")
    pass
finally:
    # Código que se ejecutará sin importar qué (ej., limpieza)
    # print("Ejecución finalizada.")
    pass`,
        'python-unittest-structure': `import unittest
from unittest.mock import patch, MagicMock

# --- Asumir que el SUT (Sistema Bajo Prueba) está importado ---
# from su_modulo import funcion_a_probar, ClaseAProbar

class TestMiCodigo(unittest.TestCase):

    def setUp(self):
        \"\"\"Configurar fixtures o variables comunes de prueba antes de cada método de prueba.\"\"\"
        # print("Configurando prueba...")
        # self.instancia = ClaseAProbar() # Ejemplo para pruebas de clase
        pass

    def tearDown(self):
        \"\"\"Limpiar después de cada método de prueba si es necesario.\"\"\"
        # print("Desmontando prueba...")
        pass

    # @patch(\'su_modulo.dependencia_a_mockear\') # Ejemplo de parcheo de una dependencia
    # def test_funcion_con_dependencia_mockeada(self, mock_dependencia):
    #     # Preparar (Arrange)
    #     mock_dependencia.return_value = "resultado_mockeado"
    #     datos_entrada = "alguna_entrada"
    #     salida_esperada = "esperado_basado_en_mock"
    #     # Actuar (Act)
    #     salida_real = funcion_a_probar(datos_entrada)
    #     # Afirmar (Assert)
    #     self.assertEqual(salida_real, salida_esperada)
    #     mock_dependencia.assert_called_once_with("arg_esperado_para_dependencia")

    def test_escenario_basico_para_funcion_a_probar(self):
        \"\"\"Probar funcion_a_probar con una entrada válida típica.\"\"\"
        # Preparar (Arrange)
        datos_entrada = "entrada_valida"
        salida_esperada = "salida_valida_esperada"
        # Actuar (Act)
        # salida_real = funcion_a_probar(datos_entrada)
        salida_real = "placeholder_eliminar_esto" # Reemplazar con llamada real
        # Afirmar (Assert)
        self.assertEqual(salida_real, salida_esperada)

    def test_caso_limite_para_funcion_a_probar(self):
        \"\"\"Probar funcion_a_probar con una entrada de caso límite.\"\"\"
        # Preparar (Arrange)
        datos_entrada = "entrada_caso_limite"
        salida_esperada = "salida_caso_limite_esperada"
        # Actuar (Act)
        # salida_real = funcion_a_probar(datos_entrada)
        salida_real = "placeholder_eliminar_esto" # Reemplazar con llamada real
        # Afirmar (Assert)
        self.assertEqual(salida_real, salida_esperada)

    def test_manejo_errores_para_funcion_a_probar(self):
        \"\"\"Probar funcion_a_probar para el manejo de errores esperado.\"\"\"
        # Preparar (Arrange)
        entrada_invalida = None # O algún otro dato inválido
        # Actuar (Act) & Afirmar (Assert)
        with self.assertRaises(TypeError): # O ValueError, CustomError, etc.
            # funcion_a_probar(entrada_invalida)
            pass # Reemplazar con llamada real que debería lanzar error

    # Añadir más métodos de prueba para diferentes escenarios y otras funciones/clases

if __name__ == '__main__':
    unittest.main(verbosity=2) # Verbosidad aumentada`,
    },
    prompts: {
        'generate-python-function': `Genera una función de Python robusta y bien documentada para realizar la siguiente tarea: {{Task Description}}.\n            Requisitos Esenciales:\n            - Argumentos de Entrada Claramente Definidos: {{Input Arguments}} (especificar nombres, tipos esperados y si son opcionales).\n            - Valor de Retorno Explícito: {{Return Value}} (especificar tipo y lo que representa).\n            - Importaciones Estándar Sugeridas: Utiliza el siguiente bloque como base para las importaciones necesarias: {{python-standard-imports}}.\n            - Manejo de Errores Proactivo: Implementa un manejo de errores exhaustivo utilizando la plantilla proporcionada en {{python-try-except-template}}, adaptándola para capturar excepciones específicas relevantes a la tarea.\n            - Tipado Estricto (Type Hints): Incluye anotaciones de tipo para todos los argumentos de la función y el valor de retorno.\n            - Documentación (Docstring) Completa: Añade un docstring conciso y claro que explique el propósito de la función, sus parámetros (con tipos y descripciones), lo que retorna, y cualquier excepción que pueda lanzar explícitamente. Sigue el formato PEP 257.\n            - Considerar Eficiencia y Legibilidad: El código generado debe ser eficiente para la tarea descrita y fácil de entender.`,
        'generate-python-unittest': `Genera una suite de pruebas unitarias exhaustiva en Python utilizando el módulo \'unittest\' para la siguiente función/clase:\n\n            Código Bajo Prueba:\n            \`\`\`python\n            {{Function Code}}\n            \`\`\`\n\n            Estructura de Pruebas Base:\n            Utiliza la siguiente estructura como plantilla para la clase de prueba:\n            {{python-unittest-structure}}\n\n            Casos de Prueba Requeridos:\n            Desarrolla casos de prueba específicos que cubran meticulosamente:\n            - Escenario Principal 1: {{Test Case 1 Description}} (incluir datos de entrada, salida esperada y lógica de la prueba).\n            - Escenario Principal 2: {{Test Case 2 Description}} (incluir datos de entrada, salida esperada y lógica de la prueba).\n            - (Opcional pero Recomendado) Casos Límite y Entradas Inválidas: {{Edge Cases Description}} (ej., entradas vacías, tipos incorrectos, valores nulos, números muy grandes/pequeños, etc., y cómo la función debería manejarlos, incluyendo excepciones esperadas).\n\n            Consideraciones Adicionales para Pruebas:\n            - Si la función tiene efectos secundarios (ej., modificación de archivos, llamadas a API), considera cómo mockearlos o aislarlos.\n            - Asegura una buena cobertura de las diferentes rutas lógicas dentro del código proporcionado.\n            - Cada prueba debe ser independiente.`
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const targetLanguageCode = 'es-ES'; // Definir el idioma objetivo

    // Obtener todas las promptversion y promptassetversion del proyecto
    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        // @ts-ignore // Quitar cuando languageCode esté en el tipo y en el include
        include: {
            prompt: { select: { id: true } }, // Incluir el id del prompt para buscar en codegenTranslations
            // languageCode: true // Asegúrate de que tu cliente Prisma está actualizado
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
        // @ts-ignore // Quitar cuando languageCode esté en el tipo y en el include
        if (version.languageCode === targetLanguageCode) {
            // @ts-ignore
            console.log(`PromptVersion ${version.id} (Prompt: ${version.prompt.id}) is already in ${targetLanguageCode}. Skipping Spanish translation.`);
            continue;
        }
        // @ts-ignore
        const translation = codegenTranslations.prompts[version.prompt.id] || version.promptText;
        await prisma.promptTranslation.upsert({
            where: {
                versionId_languageCode: {
                    versionId: version.id,
                    languageCode: targetLanguageCode
                }
            },
            update: {
                promptText: translation
            },
            create: {
                versionId: version.id,
                languageCode: targetLanguageCode,
                promptText: translation
            }
        });
        // @ts-ignore
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

    const defaultLanguageCode = process.env.DEFAULT_LANGUAGE_CODE || 'en-US';
    console.log(`Using default language code: ${defaultLanguageCode}`);

    // --- Find necessary base data --- 
    // Find test user (should exist)
    const testUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test@example.com' },
        select: { id: true, tenantId: true }
    });
    const tenantId = testUser.tenantId;

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

    // Crear Environments para el proyecto CodeGen
    const cgDevEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'development', projectId: cgProjectId } },
        update: {},
        create: { name: 'development', projectId: cgProjectId, description: 'Development environment for CodeGen project' },
        select: { id: true }
    });
    const cgStagingEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'staging', projectId: cgProjectId } },
        update: {},
        create: { name: 'staging', projectId: cgProjectId, description: 'Staging environment for CodeGen project' },
        select: { id: true }
    });
    const cgProdEnv = await prisma.environment.upsert({
        where: { projectId_name: { name: 'production', projectId: cgProjectId } },
        update: {},
        create: { name: 'production', projectId: cgProjectId, description: 'Production environment for CodeGen project' },
        select: { id: true }
    });
    console.log(`Upserted Environments (dev, staging, prod) for project ${cgProjectId}`);

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

    // 3. Upsert Prompts and their versions/assets for Code Gen
    // Define an array of prompt data to upsert
    const promptDataArray: {
        id: string; // slug
        name: string;
        description: string;
        promptText: string;
        tags: string[];
        assets?: { key: string; initialValue: string; initialChangeMessage?: string }[]; // Name no se persiste
        aiModelId?: string;
    }[] = [
            {
                id: slugify('Generate Python Function'),
                name: 'Generate Robust Python Function',
                description: 'Generates a well-documented Python function based on a task description, input/output specs, and best practices.',
                promptText: codegenTranslations.prompts['generate-python-function'],
                tags: ['python', 'function-generation', 'code-snippet', 'best-practices'],
                assets: [
                    { key: 'python-standard-imports', initialValue: codegenTranslations.assets['python-standard-imports'], initialChangeMessage: 'Initial version of standard Python imports asset' },
                    { key: 'python-try-except-template', initialValue: codegenTranslations.assets['python-try-except-template'], initialChangeMessage: 'Initial version of try-except template asset' }
                ],
                aiModelId: cgGpt4o.id
            },
            {
                id: slugify('Generate Python Unit Tests'),
                name: 'Generate Python Unit Tests',
                description: 'Generates a Python unittest suite for a given function or class, based on provided test cases and structure.',
                promptText: codegenTranslations.prompts['generate-python-unittest'],
                tags: ['python', 'unit-testing', 'test-generation', 'unittest-module'],
                assets: [
                    { key: 'python-unittest-structure', initialValue: codegenTranslations.assets['python-unittest-structure'], initialChangeMessage: 'Initial version of unittest structure asset' }
                ],
                aiModelId: cgGpt4o.id
            }
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

    for (const promptSeed of promptDataArray) {
        const prompt = await prisma.prompt.upsert({
            where: { prompt_id_project_unique: { id: promptSeed.id, projectId: cgProjectId } },
            update: {
                name: promptSeed.name,
                description: promptSeed.description,
                tags: { connect: getTagIds(promptSeed.tags) }
            },
            create: {
                id: promptSeed.id,
                name: promptSeed.name,
                description: promptSeed.description,
                projectId: cgProjectId,
                content: promptSeed.promptText,
                tenantId: tenantId,
                tags: { connect: getTagIds(promptSeed.tags) }
            },
            select: { id: true }
        });
        console.log(`Upserted Prompt: ${promptSeed.name} (ID: ${prompt.id})`);

        const assetVersionsToConnect: { id: string }[] = [];

        if (promptSeed.assets) {
            for (const assetSeed of promptSeed.assets) {
                const asset = await prisma.promptAsset.upsert({
                    where: { prompt_asset_key_unique: { key: assetSeed.key, promptId: prompt.id, projectId: cgProjectId } }, // Correct unique constraint
                    update: {},
                    create: {
                        key: assetSeed.key,
                        promptId: prompt.id,
                        projectId: cgProjectId
                    },
                    select: { id: true }
                });

                const assetVersion = await prisma.promptAssetVersion.upsert({
                    where: { assetId_versionTag: { assetId: asset.id, versionTag: 'v1.0.0' } }, // Assuming v1.0.0 for seed
                    update: {
                        value: assetSeed.initialValue,
                        changeMessage: assetSeed.initialChangeMessage || `Initial version for asset ${assetSeed.key}` // No assetSeed.name
                    },
                    create: {
                        assetId: asset.id,
                        value: assetSeed.initialValue,
                        versionTag: 'v1.0.0',
                        changeMessage: assetSeed.initialChangeMessage || `Initial version for asset ${assetSeed.key}`, // No assetSeed.name
                        status: 'active'
                    },
                    select: { id: true }
                });
                assetVersionsToConnect.push({ id: assetVersion.id });
                console.log(`Upserted PromptAsset & Version: ${assetSeed.key} for prompt ${promptSeed.name}`);
            }
        }

        // Create PromptVersion
        const promptVersion = await prisma.promptVersion.upsert({
            where: { promptId_versionTag: { promptId: prompt.id, versionTag: 'v1.0.0' } },
            update: {
                promptText: promptSeed.promptText,
                aiModelId: promptSeed.aiModelId || cgGpt4oMini.id, // Default to cgGpt4oMini if not specified
                status: 'active',
                changeMessage: `Initial version of ${promptSeed.name}`,
                languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
                // activeInEnvironments is intentionally omitted here to match the original structure of this seed file's logic
            },
            create: {
                promptId: prompt.id,
                promptText: promptSeed.promptText,
                versionTag: 'v1.0.0',
                aiModelId: promptSeed.aiModelId || cgGpt4oMini.id,
                status: 'active',
                changeMessage: `Initial version of ${promptSeed.name}`,
                languageCode: defaultLanguageCode, // <--- AÑADIDO languageCode
                activeInEnvironments: { connect: [{ id: cgDevEnv.id }, { id: cgStagingEnv.id }] } // Defaulting to dev and staging as per other seeds
            },
            select: { id: true, languageCode: true } // Asegurar que se selecciona languageCode
        });
        console.log(`Upserted PromptVersion ${promptVersion.id} (Lang: ${promptVersion.languageCode}) for prompt ${promptSeed.name}`);

        // Link PromptAssetVersions to PromptVersion (if any and if your schema supports this directly)
        // This part was previously commented out or handled differently. Assuming a direct relation isn't standard or used here.
        // if (assetVersionsToConnect.length > 0) {
        //     // await prisma.promptVersion.update({
        //     //     where: { id: promptVersion.id },
        //     //     data: { assets: { connect: assetVersionsToConnect } }
        //     // });
        //     console.log(`Attempted to connect ${assetVersionsToConnect.length} asset versions to PromptVersion ${promptVersion.id}. Schema dependent.`);
        // }
    }

    // Crear traducciones en español
    await createSpanishTranslations(cgProjectId);

    console.log('Code Generation & Assistance seeding finished.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });