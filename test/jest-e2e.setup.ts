import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(__dirname, '../japm.test.db');

// Eliminar la base de datos antes de cada suite
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

// Ejecutar migraciones
execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', { stdio: 'inherit' });

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

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
            prisma.user.deleteMany(),
            prisma.asset.deleteMany(),
            prisma.tenant.deleteMany(),
        ]);
    } catch (error) {
        console.error('Error limpiando la base de datos:', error);
        throw error;
    }
}

beforeAll(async () => {
    // No limpiamos la base de datos al inicio
});

beforeEach(async () => {
    // No limpiamos la base de datos antes de cada test
});

afterAll(async () => {
    // No limpiamos la base de datos al final
    await prisma.$disconnect();
}); 