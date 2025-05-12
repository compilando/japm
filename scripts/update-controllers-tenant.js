/**
 * Script para actualizar controladores con el decorador WithTenant
 * 
 * Uso:
 * node scripts/update-controllers-tenant.js
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const SRC_DIR = path.join(__dirname, '..', 'src');
const CONTROLLERS_PATTERN = /\.controller\.ts$/;
const TENANT_IMPORT = 'import { WithTenant } from \'../common/tenant\';';
const METHOD_PATTERN = /@(Get|Post|Put|Patch|Delete)(\(\s*['"]?[^)]*['"]?\s*\))?[\s\n]*[^(]*\(/g;

// Función para actualizar un archivo de controlador
async function updateControllerFile(filePath) {
    console.log(`Procesando: ${filePath}`);
    try {
        const content = await readFile(filePath, 'utf8');

        // Verificar si ya usa el decorador WithTenant
        if (content.includes('@WithTenant()')) {
            console.log(`  Ya usa WithTenant, omitiendo...`);
            return false;
        }

        let updatedContent = content;

        // 1. Añadir import de WithTenant si no existe
        if (!updatedContent.includes('import { WithTenant }')) {
            const importLines = updatedContent.split('\n').filter(line => line.startsWith('import '));
            const lastImportIndex = updatedContent.lastIndexOf(importLines[importLines.length - 1]);
            updatedContent =
                updatedContent.substring(0, lastImportIndex + importLines[importLines.length - 1].length) +
                '\n' + TENANT_IMPORT +
                updatedContent.substring(lastImportIndex + importLines[importLines.length - 1].length);
        }

        // 2. Actualizar los métodos del controlador para usar @WithTenant()
        let methodMatches;
        let lastIndex = 0;
        let result = updatedContent;

        // Patrón para buscar los parámetros de los métodos del controlador
        const methodPattern = new RegExp(METHOD_PATTERN);

        while ((methodMatches = methodPattern.exec(updatedContent)) !== null) {
            const fullMatch = methodMatches[0];
            const methodIndex = methodMatches.index + fullMatch.length;

            // Buscar el paréntesis de cierre de los parámetros
            let paramEndIndex = methodIndex;
            let depth = 1;
            while (depth > 0 && paramEndIndex < updatedContent.length) {
                if (updatedContent[paramEndIndex] === '(') depth++;
                if (updatedContent[paramEndIndex] === ')') depth--;
                paramEndIndex++;
            }

            // Obtener la lista de parámetros
            const paramsSection = updatedContent.substring(methodIndex, paramEndIndex);

            // Verificar si ya tiene el parámetro tenantId
            if (!paramsSection.includes('tenantId') && !paramsSection.includes('@WithTenant()')) {
                // Insertar el decorador WithTenant en el primer parámetro o añadir un nuevo parámetro
                if (paramsSection.trim() === '') {
                    // No hay parámetros, añadir uno nuevo
                    result =
                        result.substring(0, methodIndex) +
                        '@WithTenant() tenantId: string' +
                        result.substring(paramEndIndex - 1);
                } else {
                    // Ya hay parámetros, añadir como primer parámetro
                    result =
                        result.substring(0, methodIndex) +
                        '@WithTenant() tenantId: string, ' +
                        result.substring(methodIndex);
                }
            }
        }

        // Guardar cambios si hay diferencias
        if (content !== result) {
            await writeFile(filePath, result, 'utf8');
            console.log(`  Actualizado con éxito`);
            return true;
        } else {
            console.log(`  No se requieren cambios`);
            return false;
        }

    } catch (error) {
        console.error(`Error al procesar ${filePath}:`, error);
        return false;
    }
}

// Función recursiva para encontrar todos los archivos de controlador
async function findControllerFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async entry => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? findControllerFiles(fullPath) : fullPath;
    }));

    return files
        .flat()
        .filter(file => CONTROLLERS_PATTERN.test(file));
}

// Función principal
async function main() {
    try {
        console.log('Buscando archivos de controlador...');
        const controllerFiles = await findControllerFiles(SRC_DIR);
        console.log(`Encontrados ${controllerFiles.length} archivos de controlador`);

        let updated = 0;
        for (const file of controllerFiles) {
            const wasUpdated = await updateControllerFile(file);
            if (wasUpdated) updated++;
        }

        console.log(`\nResumen:`);
        console.log(`${updated} controladores actualizados de ${controllerFiles.length} totales`);
        console.log(`\nRecuerda revisar manualmente cada controlador para asegurar que se estén usando correctamente los parámetros tenantId`);

    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 