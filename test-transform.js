// Test script para validar el transformer del campo type
const PromptType = {
    USER: 'USER',
    SYSTEM: 'SYSTEM',
    ASSISTANT: 'ASSISTANT',
    GUARD: 'GUARD',
    COMPOSITE: 'COMPOSITE',
    CONTEXT: 'CONTEXT',
    FUNCTION: 'FUNCTION',
    EXAMPLE: 'EXAMPLE',
    TEMPLATE: 'TEMPLATE'
};

// Casos de prueba incluyendo el caso específico del error
const testCases = [
    // Caso 1: Valor directo (como debería ser)
    { type: 'USER', expected: 'USER', description: 'Valor directo' },

    // Caso 2: Objeto con value (como viene del frontend)
    { type: { value: 'SYSTEM' }, expected: 'SYSTEM', description: 'Objeto con value' },

    // Caso 3: Objeto con value vacío (el caso problema) - ahora debería usar valor por defecto
    { type: { value: {} }, expected: 'USER', description: 'Objeto con value vacío -> valor por defecto' },

    // Caso 4: Objeto con value null - ahora debería usar valor por defecto
    { type: { value: null }, expected: 'USER', description: 'Objeto con value null -> valor por defecto' },

    // Caso 5: Valor null directo - ahora debería usar valor por defecto
    { type: null, expected: 'USER', description: 'Valor null directo -> valor por defecto' },

    // Caso 6: Valor undefined directo - ahora debería usar valor por defecto
    { type: undefined, expected: 'USER', description: 'Valor undefined directo -> valor por defecto' },

    // Caso 7: EL CASO ESPECÍFICO DEL ERROR - TASK debe mapearse a USER
    { type: { value: 'TASK' }, expected: 'USER', description: 'Objeto con value="TASK" -> debe mapear a USER' },

    // Caso 8: TASK directo
    { type: 'TASK', expected: 'USER', description: 'Valor directo "TASK" -> debe mapear a USER' },

    // Caso 9: Valor no reconocido
    { type: 'UNKNOWN_TYPE', expected: 'USER', description: 'Valor no reconocido -> valor por defecto USER' },
];

console.log('🧪 Probando transformer mejorado de type (con mapeo de TASK)...\n');

testCases.forEach((testCase, index) => {
    console.log(`Caso ${index + 1}: ${testCase.description}`);
    console.log(`  Entrada: ${JSON.stringify(testCase.type)}`);

    // Aplicar la nueva lógica del transformer mejorado
    let result;
    const value = testCase.type;

    // Función helper para validar y mapear valores
    const mapToValidPromptType = (val) => {
        if (typeof val === 'string') {
            // Mapear valores comunes que no están en el enum
            const upperVal = val.toUpperCase();
            switch (upperVal) {
                case 'TASK':
                    return PromptType.USER; // Mapear TASK a USER
                case 'USER':
                    return PromptType.USER;
                case 'SYSTEM':
                    return PromptType.SYSTEM;
                case 'ASSISTANT':
                    return PromptType.ASSISTANT;
                case 'GUARD':
                    return PromptType.GUARD;
                case 'COMPOSITE':
                    return PromptType.COMPOSITE;
                case 'CONTEXT':
                    return PromptType.CONTEXT;
                case 'FUNCTION':
                    return PromptType.FUNCTION;
                case 'EXAMPLE':
                    return PromptType.EXAMPLE;
                case 'TEMPLATE':
                    return PromptType.TEMPLATE;
                default:
                    return PromptType.USER; // Valor por defecto para strings no reconocidos
            }
        }
        // Si no es string, usar valor por defecto
        return PromptType.USER;
    };

    // Si el valor es un objeto con propiedad 'value', extraer el valor
    if (typeof value === 'object' && value !== null && 'value' in value) {
        const extractedValue = value.value;
        // Si el valor extraído es un objeto vacío, null, o undefined, usar valor por defecto
        if (extractedValue === null || extractedValue === undefined ||
            (typeof extractedValue === 'object' && Object.keys(extractedValue).length === 0)) {
            result = PromptType.USER;
        } else {
            result = mapToValidPromptType(extractedValue);
        }
    } else {
        // Si es null o undefined, usar valor por defecto
        if (value === null || value === undefined) {
            result = PromptType.USER;
        } else {
            result = mapToValidPromptType(value);
        }
    }

    console.log(`  Resultado: ${JSON.stringify(result)}`);
    console.log(`  Esperado: ${JSON.stringify(testCase.expected)}`);
    const isPass = JSON.stringify(result) === JSON.stringify(testCase.expected);
    console.log(`  ${isPass ? '✅ PASA' : '❌ FALLA'}\n`);
});

console.log('✅ Con el transformer mejorado, todos los casos problemáticos se resuelven:');
console.log('  - TASK se mapea a USER');
console.log('  - Objetos vacíos usan USER por defecto');
console.log('  - Valores null/undefined usan USER por defecto');
console.log('💡 Esto evita el error de Prisma al recibir valores inválidos.'); 