const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testRateLimit(endpoint, maxRequests = 10, description = '') {
    console.log(`\n🧪 Probando rate limiting: ${description}`);
    console.log(`📍 Endpoint: ${endpoint}`);
    console.log(`🔢 Realizando ${maxRequests} requests...`);

    const requests = [];
    const results = {
        success: 0,
        rateLimited: 0,
        errors: 0
    };

    for (let i = 0; i < maxRequests; i++) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                timeout: 5000,
                validateStatus: () => true // No lanzar error en status 429
            });

            if (response.status === 200) {
                results.success++;
                console.log(`  ✅ Request ${i + 1}: Success (${response.status})`);
            } else if (response.status === 429) {
                results.rateLimited++;
                console.log(`  🚫 Request ${i + 1}: Rate Limited (${response.status})`);

                // Mostrar headers de rate limiting si están disponibles
                const headers = response.headers;
                if (headers['x-ratelimit-limit']) {
                    console.log(`     💡 Límite: ${headers['x-ratelimit-limit']}`);
                }
                if (headers['x-ratelimit-remaining']) {
                    console.log(`     💡 Restantes: ${headers['x-ratelimit-remaining']}`);
                }
            } else {
                results.errors++;
                console.log(`  ❌ Request ${i + 1}: Error (${response.status})`);
            }
        } catch (error) {
            results.errors++;
            console.log(`  ❌ Request ${i + 1}: Error - ${error.message}`);
        }

        // Pequeña pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Resultados:`);
    console.log(`  ✅ Exitosos: ${results.success}`);
    console.log(`  🚫 Rate Limited: ${results.rateLimited}`);
    console.log(`  ❌ Errores: ${results.errors}`);

    return results;
}

async function main() {
    console.log('🚀 Iniciando pruebas de Rate Limiting para JAPM');
    console.log('='.repeat(50));

    try {
        // Test 1: Health Check (debería ser muy permisivo - 200/min)
        await testRateLimit('/health', 15, 'Health Check (permisivo)');

        // Test 2: Endpoint inexistente para probar límite por defecto
        await testRateLimit('/api/nonexistent', 105, 'Endpoint general (100/min por defecto)');

        console.log('\n🏁 Pruebas completadas!');
        console.log('\n💡 Notas:');
        console.log('  - Si ves status 429, el rate limiting está funcionando');
        console.log('  - Health check debería permitir más requests');
        console.log('  - Endpoints regulares deberían limitarse según configuración');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
    }
}

// Verificar si se está ejecutando directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testRateLimit }; 