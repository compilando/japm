import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Crear tenant por defecto
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Default Tenant',
        },
    });

    // 2. Crear usuario admin asociado al tenant
    const adminUser = await prisma.user.create({
        data: {
            name: 'Admin',
            email: 'admin@default.com',
            password: 'admin', // ¡En producción usa hash!
            tenantId: tenant.id,
            role: 'admin',
        },
    });

    // 3. Crear un proyecto de ejemplo asociado al tenant y al usuario admin
    await prisma.project.create({
        data: {
            id: 'project-1',
            name: 'Proyecto de ejemplo',
            description: 'Proyecto migrado al tenant por defecto',
            tenantId: tenant.id,
            ownerUserId: adminUser.id,
        },
    });

    console.log('Migración de datos a multitenant completada.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 