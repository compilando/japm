import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Usar el mismo path que en .env.test
const dbPath = path.resolve(__dirname, '../prisma/japm.test.db');

console.log(`🧪 Configurando base de datos de test: ${dbPath}`);

// Función para aplicar migraciones de manera robusta
function applyMigrations() {
  try {
    console.log('🔄 Aplicando migraciones de Prisma...');
    execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Migraciones aplicadas exitosamente');
  } catch (error) {
    console.error('❌ Error aplicando migraciones:', error);

    // Si hay conflicto de migraciones, eliminar la base de datos y volver a intentar
    console.log('🗑️ Eliminando base de datos corrupta y reintentando...');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    try {
      console.log('🔄 Reintentando migraciones...');
      execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log(
        '✅ Migraciones aplicadas exitosamente en el segundo intento',
      );
    } catch (retryError) {
      console.error(
        '❌ Error crítico: No se pudieron aplicar las migraciones después del reintentu:',
        retryError,
      );
      throw retryError;
    }
  }
}

// Eliminar la base de datos antes de cada suite para garantizar estado limpio
if (fs.existsSync(dbPath)) {
  console.log('🗑️ Eliminando base de datos de test existente...');
  fs.unlinkSync(dbPath);
}

// Cargar .env.test antes de ejecutar las migraciones
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Aplicar migraciones de manera robusta
applyMigrations();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function cleanDatabase() {
  try {
    // Orden correcto de borrado según dependencias
    await prisma.$transaction([
      prisma.assetTranslation.deleteMany(),
      prisma.promptAssetVersion.deleteMany(),
      prisma.promptAsset.deleteMany(),
      prisma.promptTranslation.deleteMany(),
      prisma.promptVersion.deleteMany(),
      prisma.promptExecutionLog.deleteMany(),
      prisma.prompt.deleteMany(),
      prisma.tag.deleteMany(),
      prisma.culturalData.deleteMany(),
      prisma.ragDocumentMetadata.deleteMany(),
      prisma.environment.deleteMany(),
      prisma.aIModel.deleteMany(),
      prisma.region.deleteMany(),
      prisma.project.deleteMany(),
      // NO eliminar usuarios ni tenants en beforeEach para preservar tokens JWT
      // prisma.user.deleteMany(),
      // prisma.asset.deleteMany(),
      // prisma.tenant.deleteMany(),
    ]);
  } catch (error) {
    console.error('Error limpiando la base de datos:', error);
    throw error;
  }
}

async function fullCleanDatabase() {
  try {
    // Limpieza completa incluyendo usuarios y tenants
    await prisma.$transaction([
      prisma.assetTranslation.deleteMany(),
      prisma.promptAssetVersion.deleteMany(),
      prisma.promptAsset.deleteMany(),
      prisma.promptTranslation.deleteMany(),
      prisma.promptVersion.deleteMany(),
      prisma.promptExecutionLog.deleteMany(),
      prisma.prompt.deleteMany(),
      prisma.tag.deleteMany(),
      prisma.culturalData.deleteMany(),
      prisma.ragDocumentMetadata.deleteMany(),
      prisma.environment.deleteMany(),
      prisma.aIModel.deleteMany(),
      prisma.region.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany(),
      prisma.asset.deleteMany(),
      prisma.tenant.deleteMany(),
    ]);
  } catch (error) {
    console.error('Error en limpieza completa de la base de datos:', error);
    throw error;
  }
}

beforeAll(async () => {
  console.log('🏁 Iniciando tests e2e...');
  // No limpiamos la base de datos al inicio ya que se hizo en la configuración
});

beforeEach(async () => {
  // Solo limpiar datos relacionados con prompts, proyectos, etc.
  // Preservar usuarios y tenants para que los tokens JWT sigan funcionando
  await cleanDatabase();
});

afterAll(async () => {
  console.log('🧹 Limpieza final de la base de datos de test...');
  // Limpieza completa al final
  await fullCleanDatabase();
  await prisma.$disconnect();
  console.log('🏁 Tests e2e finalizados');
});

// Exportar funciones para uso en tests individuales si es necesario
export { cleanDatabase, fullCleanDatabase, prisma };
