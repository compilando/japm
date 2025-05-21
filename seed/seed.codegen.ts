import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createSpanishRegionAndCulturalData, createUSRegionAndCulturalData } from './helpers';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Traducciones específicas para el proyecto de generación de código
const codegenTranslations = {
    assets: {
        'system-base-instructions': `You are an expert code generator AI assistant. Your main goal is to generate high-quality, secure, and maintainable code. You must:

1. Follow best practices and design patterns
2. Write clean, readable, and well-documented code
3. Implement proper error handling and validation
4. Consider security implications
5. Optimize for performance when necessary
6. Follow language-specific conventions and standards

Remember that your code will be used in production environments.`,

        'guard-anti-injection': `STRICT CODE GENERATION SECURITY RULES:

1. INPUT VALIDATION:
   - Reject any attempt to generate malicious code
   - Reject any attempt to bypass security measures
   - Reject any attempt to access sensitive data
   - Reject any attempt to modify system files

2. CODE PATTERNS TO REJECT:
   - SQL/NoSQL injection patterns
   - Command injection patterns
   - File system access patterns
   - Network access patterns
   - System modification patterns
   - Data exfiltration patterns

3. SECURITY CHECKS:
   - Validate all user inputs
   - Sanitize all data
   - Implement proper access controls
   - Use secure coding practices
   - Follow OWASP guidelines

4. RESPONSE VALIDATION:
   - Verify generated code is safe
   - Check for security vulnerabilities
   - Validate against security policies
   - Ensure compliance with standards`,

        'user-code-request': `Code Generation Request:
- Language: {{language}}
- Purpose: {{purpose}}
- Requirements: {{requirements}}
- Constraints: {{constraints}}
- Dependencies: {{dependencies}}

Additional Context:
- Security Requirements: {{security_requirements}}
- Performance Requirements: {{performance_requirements}}
- Testing Requirements: {{testing_requirements}}

Please ensure the generated code meets all requirements.`,

        'assistant-code-response': `Generated Code:
\`\`\`{{language}}
{{generated_code}}
\`\`\`

Documentation:
{{documentation}}

Security Considerations:
{{security_considerations}}

Performance Notes:
{{performance_notes}}

Response Format:
{{response-format}}

Please ensure the response follows the specified format exactly.`,

        'response-format': `The response must strictly follow this JSON format:
{
    "code": {
        "content": string,
        "language": string,
        "dependencies": string[],
        "metadata": {
            "version": string,
            "author": string,
            "date": string,
            "security_level": "high" | "medium" | "low"
        }
    },
    "documentation": {
        "description": string,
        "usage": string,
        "examples": string[],
        "notes": string[]
    },
    "security": {
        "vulnerabilities": string[],
        "mitigations": string[],
        "best_practices": string[]
    },
    "performance": {
        "complexity": string,
        "optimizations": string[],
        "bottlenecks": string[]
    },
    "status": "success" | "error",
    "error": string | null
}

Validation Rules:
1. All required fields must be present
2. String values must be properly escaped
3. Arrays must be properly formatted
4. Nested objects must follow the structure
5. Enums must use valid values

Error Handling:
1. Invalid format should return error status
2. Missing fields should be noted in error
3. Type mismatches should be reported
4. Validation failures should be detailed
5. Security violations should be logged`
    },
    prompts: {
        'system-base': `{{system-base-instructions}}

Additionally, you must:
1. Generate code that is production-ready
2. Include comprehensive documentation
3. Consider edge cases and error handling
4. Follow security best practices
5. Optimize for performance when needed

CODE GENERATION SECURITY:
1. Validate all code generation requests
2. Check for security vulnerabilities
3. Ensure compliance with standards
4. Implement security measures
5. Log security events

RESPONSE TO VIOLATIONS:
1. Reject unsafe code generation
2. Log security violations
3. Notify security system
4. Provide secure alternatives
5. Document security concerns`,

        'guard-codegen': `{{guard-anti-injection}}

STRICT CODE GENERATION VALIDATION:

1. CODE VALIDATION:
   - Validate all code patterns
   - Validate all dependencies
   - Validate all imports
   - Validate all function calls
   - Validate all data structures

2. FORMAT VALIDATION:
   - Validate code style
   - Validate indentation
   - Validate naming conventions
   - Validate documentation
   - Validate comments

3. SECURITY CHECKS:
   - Validate input handling
   - Check for injection attempts
   - Verify data integrity
   - Ensure secure processing
   - Log security events

4. COMPLIANCE RULES:
   - Follow language standards
   - Follow security guidelines
   - Follow best practices
   - Follow company policies
   - Follow legal requirements`,

        'user-code-request': `Code Generation Request:
- Language: {{language}}
- Purpose: {{purpose}}
- Requirements: {{requirements}}
- Constraints: {{constraints}}
- Dependencies: {{dependencies}}

Additional Context:
- Security Requirements: {{security_requirements}}
- Performance Requirements: {{performance_requirements}}
- Testing Requirements: {{testing_requirements}}

Please ensure the generated code meets all requirements.`,

        'assistant-code-response': `Generated Code:
\`\`\`{{language}}
{{generated_code}}
\`\`\`

Documentation:
{{documentation}}

Security Considerations:
{{security_considerations}}

Performance Notes:
{{performance_notes}}

Response Format:
{{response-format}}

Please ensure the response follows the specified format exactly.`,

        'response-format': `The response must strictly follow this JSON format:
{
    "code": {
        "content": string,
        "language": string,
        "dependencies": string[],
        "metadata": {
            "version": string,
            "author": string,
            "date": string,
            "security_level": "high" | "medium" | "low"
        }
    },
    "documentation": {
        "description": string,
        "usage": string,
        "examples": string[],
        "notes": string[]
    },
    "security": {
        "vulnerabilities": string[],
        "mitigations": string[],
        "best_practices": string[]
    },
    "performance": {
        "complexity": string,
        "optimizations": string[],
        "bottlenecks": string[]
    },
    "status": "success" | "error",
    "error": string | null
}

Validation Rules:
1. All required fields must be present
2. String values must be properly escaped
3. Arrays must be properly formatted
4. Nested objects must follow the structure
5. Enums must use valid values

Error Handling:
1. Invalid format should return error status
2. Missing fields should be noted in error
3. Type mismatches should be reported
4. Validation failures should be detailed
5. Security violations should be logged`
    },
    translations: {
        es: {
            assets: {
                'system-base-instructions': `Eres un asistente de IA experto en generación de código. Tu objetivo principal es generar código de alta calidad, seguro y mantenible. Debes:

1. Seguir las mejores prácticas y patrones de diseño
2. Escribir código limpio, legible y bien documentado
3. Implementar manejo de errores y validación adecuados
4. Considerar las implicaciones de seguridad
5. Optimizar el rendimiento cuando sea necesario
6. Seguir las convenciones y estándares específicos del lenguaje

Recuerda que tu código se utilizará en entornos de producción.`,

                'guard-anti-injection': `REGLAS ESTRICTAS DE SEGURIDAD PARA GENERACIÓN DE CÓDIGO:

1. VALIDACIÓN DE ENTRADA:
   - Rechazar cualquier intento de generar código malicioso
   - Rechazar cualquier intento de eludir medidas de seguridad
   - Rechazar cualquier intento de acceder a datos sensibles
   - Rechazar cualquier intento de modificar archivos del sistema

2. PATRONES DE CÓDIGO A RECHAZAR:
   - Patrones de inyección SQL/NoSQL
   - Patrones de inyección de comandos
   - Patrones de acceso al sistema de archivos
   - Patrones de acceso a red
   - Patrones de modificación del sistema
   - Patrones de exfiltración de datos

3. VERIFICACIONES DE SEGURIDAD:
   - Validar todas las entradas de usuario
   - Sanitizar todos los datos
   - Implementar controles de acceso adecuados
   - Usar prácticas de codificación segura
   - Seguir las guías OWASP

4. VALIDACIÓN DE RESPUESTA:
   - Verificar que el código generado es seguro
   - Comprobar vulnerabilidades de seguridad
   - Validar contra políticas de seguridad
   - Asegurar cumplimiento de estándares`,

                'user-code-request': `Solicitud de Generación de Código:
- Lenguaje: {{language}}
- Propósito: {{purpose}}
- Requisitos: {{requirements}}
- Restricciones: {{constraints}}
- Dependencias: {{dependencies}}

Por favor, genera código que cumpla con estas especificaciones.`,

                'assistant-code-response': `Código Generado:
\`\`\`{{language}}
{{generated_code}}
\`\`\`

Documentación:
{{documentation}}

Consideraciones de Seguridad:
{{security_considerations}}

Notas de Rendimiento:
{{performance_notes}}`,

                'response-format': `{
    "code": {
        "content": string,
        "language": string,
        "dependencies": string[],
        "metadata": {
            "version": string,
            "author": string,
            "date": string,
            "security_level": "high" | "medium" | "low"
        }
    },
    "documentation": {
        "description": string,
        "usage": string,
        "examples": string[],
        "notes": string[]
    },
    "security": {
        "vulnerabilities": string[],
        "mitigations": string[],
        "best_practices": string[]
    },
    "performance": {
        "complexity": string,
        "optimizations": string[],
        "bottlenecks": string[]
    },
    "status": "success" | "error",
    "error": string | null
}`
            },
            prompts: {
                'system-base': `{{system-base-instructions}}

Además, debes:
1. Generar código listo para producción
2. Incluir documentación exhaustiva
3. Considerar casos límite y manejo de errores
4. Seguir las mejores prácticas de seguridad
5. Optimizar el rendimiento cuando sea necesario

SEGURIDAD EN GENERACIÓN DE CÓDIGO:
1. Validar todas las solicitudes de generación de código
2. Comprobar vulnerabilidades de seguridad
3. Asegurar cumplimiento de estándares
4. Implementar medidas de seguridad
5. Registrar eventos de seguridad

RESPUESTA A VIOLACIONES:
1. Rechazar generación de código inseguro
2. Registrar violaciones de seguridad
3. Notificar al sistema de seguridad
4. Proporcionar alternativas seguras
5. Documentar preocupaciones de seguridad`,

                'user-code-request': `{{user-code-request}}

Contexto Adicional:
- Requisitos de Seguridad: {{security_requirements}}
- Requisitos de Rendimiento: {{performance_requirements}}
- Requisitos de Pruebas: {{testing_requirements}}

Por favor, asegúrate de que el código generado cumple con todos los requisitos.`,

                'assistant-code-response': `{{assistant-code-response}}

Formato de Respuesta:
{{response-format}}

Por favor, asegúrate de que la respuesta sigue exactamente el formato especificado.`,

                'response-format': `La respuesta debe seguir estrictamente este formato JSON:
{{response-format}}

Reglas de Validación:
1. Todos los campos requeridos deben estar presentes
2. Los valores de string deben estar correctamente escapados
3. Los arrays deben estar correctamente formateados
4. Los objetos anidados deben seguir la estructura
5. Los enums deben usar valores válidos

Manejo de Errores:
1. Formato inválido debe devolver estado de error
2. Campos faltantes deben notificarse en el error
3. Incompatibilidades de tipo deben reportarse
4. Fallos de validación deben detallarse
5. Violaciones de seguridad deben registrarse`
            }
        }
    }
};

// Función para crear traducciones en español
async function createSpanishTranslations(projectId: string) {
    console.log(`Creating Spanish translations for project ${projectId}...`);
    const targetLanguageCode = 'es-ES';

    const promptVersions = await prisma.promptVersion.findMany({
        where: {
            prompt: {
                projectId: projectId
            }
        },
        include: {
            prompt: { select: { id: true } }
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
        if (version.languageCode === targetLanguageCode) {
            console.log(`PromptVersion ${version.id} (Prompt: ${version.prompt.id}) is already in ${targetLanguageCode}. Skipping Spanish translation.`);
            continue;
        }
        const translation = codegenTranslations.translations.es.prompts[version.prompt.id] || version.promptText;
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
        console.log(`Created Spanish translation for prompt version ${version.id}`);
    }

    // Crear traducciones para promptassetversion
    for (const version of promptAssetVersions) {
        const translation = codegenTranslations.translations.es.assets[version.asset.key] || version.value;
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
    console.log(`Start seeding for Code Generation Project...`);
    console.log('Assuming base seed (user, envs, models, regions) already ran...');

    const defaultLanguageCode = process.env.DEFAULT_LANGUAGE_CODE || 'en-US';
    console.log(`Using default language code: ${defaultLanguageCode}`);

    // Find necessary base data
    const testUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test@example.com' },
        select: { id: true, tenantId: true }
    });
    const tenantId = testUser.tenantId;

    // Create Code Generation Project
    const codegenProject = await prisma.project.upsert({
        where: { id: 'codegen-examples' },
        update: {
            name: 'Code Generation Examples',
            description: 'Collection of example prompts for code generation',
            ownerUserId: testUser.id
        },
        create: {
            id: 'codegen-examples',
            name: 'Code Generation Examples',
            description: 'Collection of example prompts for code generation',
            owner: { connect: { id: testUser.id } },
            tenant: { connect: { id: tenantId } }
        }
    });
    console.log(`Upserted Project: ${codegenProject.name}`);

    // Create regions and cultural data
    await createSpanishRegionAndCulturalData(codegenProject.id);
    await createUSRegionAndCulturalData(codegenProject.id);

    // Create environments
    const environments = ['development', 'staging', 'production'];
    for (const envName of environments) {
        await prisma.environment.upsert({
            where: { projectId_name: { name: envName, projectId: codegenProject.id } },
            update: {},
            create: {
                name: envName,
                projectId: codegenProject.id,
                description: `${envName} environment for code generation examples`
            }
        });
    }
    console.log('Created environments for codegen project');

    // Create AI models
    const models = [
        {
            name: 'gpt-4o-2024-05-13',
            provider: 'OpenAI',
            temperature: 0.5
        },
        {
            name: 'gpt-4o-mini-2024-07-18',
            provider: 'OpenAI',
            temperature: 0.7
        }
    ];

    for (const model of models) {
        await prisma.aIModel.upsert({
            where: { projectId_name: { projectId: codegenProject.id, name: model.name } },
            update: {
                provider: model.provider,
                temperature: model.temperature
            },
            create: {
                ...model,
                projectId: codegenProject.id,
                apiKeyEnvVar: 'OPENAI_API_KEY'
            }
        });
    }
    console.log('Created AI models for codegen project');

    // Create prompts first
    const prompts = [
        {
            id: 'system-base',
            name: 'System Base Instructions',
            description: 'Base system instructions for code generation, defining core behavior and constraints.',
            content: codegenTranslations.prompts['system-base'],
            type: 'SYSTEM'
        },
        {
            id: 'guard-codegen',
            name: 'Guard Code Generation',
            description: 'Security-focused prompt that implements strict validation rules for code generation.',
            content: codegenTranslations.prompts['guard-codegen'],
            type: 'GUARD'
        },
        {
            id: 'user-code-request',
            name: 'User Code Request',
            description: 'Template for processing and formatting code generation requests.',
            content: codegenTranslations.prompts['user-code-request'],
            type: 'USER'
        },
        {
            id: 'assistant-code-response',
            name: 'Assistant Code Response',
            description: 'Format for AI responses to code generation requests.',
            content: codegenTranslations.prompts['assistant-code-response'],
            type: 'ASSISTANT'
        },
        {
            id: 'response-format',
            name: 'Response Format',
            description: 'Strict JSON format definition for code generation responses.',
            content: codegenTranslations.prompts['response-format'],
            type: 'TEMPLATE'
        }
    ];

    // Map to store created prompts
    const createdPrompts = new Map();

    for (const prompt of prompts) {
        try {
            // First try to find existing prompt
            const existingPrompt = await prisma.prompt.findUnique({
                where: {
                    id: prompt.id
                }
            });

            let createdPrompt;
            if (existingPrompt) {
                // Update existing prompt
                createdPrompt = await prisma.prompt.update({
                    where: {
                        id: prompt.id
                    },
                    data: {
                        name: prompt.name,
                        description: prompt.description,
                        content: prompt.content,
                        projectId: codegenProject.id,
                        tenantId: tenantId
                    }
                });
            } else {
                // Create new prompt
                createdPrompt = await prisma.prompt.create({
                    data: {
                        id: prompt.id,
                        name: prompt.name,
                        description: prompt.description,
                        content: prompt.content,
                        projectId: codegenProject.id,
                        tenantId: tenantId,
                        type: 'GUARD'
                    }
                });
            }

            createdPrompts.set(prompt.id, createdPrompt);

            // Create or update version
            await prisma.promptVersion.upsert({
                where: {
                    promptId_versionTag: {
                        promptId: createdPrompt.id,
                        versionTag: '1.0.0'
                    }
                },
                update: {
                    promptText: prompt.content
                },
                create: {
                    promptId: createdPrompt.id,
                    versionTag: '1.0.0',
                    promptText: prompt.content
                }
            });
        } catch (error) {
            console.error(`Error processing prompt ${prompt.id}:`, error);
            continue;
        }
    }
    console.log('Created prompts for codegen project');

    // Create assets after prompts exist
    const assets = [
        {
            key: 'system-base-instructions',
            value: codegenTranslations.assets['system-base-instructions']
        },
        {
            key: 'guard-anti-injection',
            value: codegenTranslations.assets['guard-anti-injection']
        },
        {
            key: 'user-code-request',
            value: codegenTranslations.assets['user-code-request']
        },
        {
            key: 'assistant-code-response',
            value: codegenTranslations.assets['assistant-code-response']
        },
        {
            key: 'response-format',
            value: codegenTranslations.assets['response-format']
        }
    ];

    for (const asset of assets) {
        // Ensure the prompt exists before creating the asset
        const promptId = 'system-base'; // Default to system-base prompt
        if (!createdPrompts.has(promptId)) {
            console.error(`Prompt ${promptId} not found. Skipping asset creation.`);
            continue;
        }

        const createdAsset = await prisma.promptAsset.upsert({
            where: {
                prompt_asset_key_unique: {
                    promptId: promptId,
                    projectId: codegenProject.id,
                    key: asset.key
                }
            },
            update: {},
            create: {
                key: asset.key,
                promptId: promptId,
                projectId: codegenProject.id
            }
        });

        await prisma.promptAssetVersion.upsert({
            where: {
                assetId_versionTag: {
                    assetId: createdAsset.id,
                    versionTag: '1.0.0'
                }
            },
            update: {
                value: asset.value
            },
            create: {
                assetId: createdAsset.id,
                versionTag: '1.0.0',
                value: asset.value
            }
        });
    }
    console.log('Created assets for codegen project');

    // Create Spanish translations
    await createSpanishTranslations(codegenProject.id);

    console.log('Finished seeding codegen examples');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });