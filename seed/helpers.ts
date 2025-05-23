import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Función helper para crear región es-ES y sus datos culturales
export async function createSpanishRegionAndCulturalData(projectId: string) {
    console.log(`Creating Spanish region and cultural data for project ${projectId}...`);

    // Crear región es-ES
    const regionES = await prisma.region.upsert({
        where: {
            projectId_languageCode: {
                projectId: projectId,
                languageCode: 'es-ES'
            }
        },
        update: {
            name: 'España',
            timeZone: 'Europe/Madrid'
        },
        create: {
            languageCode: 'es-ES',
            name: 'España',
            timeZone: 'Europe/Madrid',
            project: { connect: { id: projectId } }
        }
    });
    console.log(`Upserted Region: ${regionES.name} (ID: ${regionES.id})`);

    // Crear datos culturales para es-ES
    const culturalDataES = await prisma.culturalData.upsert({
        where: {
            projectId_key: {
                projectId: projectId,
                key: 'es-formal'
            }
        },
        update: {
            style: 'Lenguaje formal y directo común en el español de negocios.',
            region: { connect: { id: regionES.id } }
        },
        create: {
            key: 'es-formal',
            style: 'Lenguaje formal y directo común en el español de negocios.',
            project: { connect: { id: projectId } },
            region: { connect: { id: regionES.id } }
        }
    });
    console.log(`Upserted CulturalData for ES (Key: ${culturalDataES.key})`);

    return { regionES, culturalDataES };
}

// Función helper para crear región en-US y sus datos culturales
export async function createUSRegionAndCulturalData(projectId: string) {
    console.log(`Creating US region and cultural data for project ${projectId}...`);

    // Crear región en-US
    const regionUS = await prisma.region.upsert({
        where: {
            projectId_languageCode: {
                projectId: projectId,
                languageCode: 'en-US'
            }
        },
        update: {
            name: 'United States',
            timeZone: 'America/New_York'
        },
        create: {
            languageCode: 'en-US',
            name: 'United States',
            timeZone: 'America/New_York',
            project: { connect: { id: projectId } }
        }
    });
    console.log(`Upserted Region: ${regionUS.name} (ID: ${regionUS.id})`);

    // Crear datos culturales para en-US
    const culturalDataUS = await prisma.culturalData.upsert({
        where: {
            projectId_key: {
                projectId: projectId,
                key: 'us-informal'
            }
        },
        update: {
            style: 'Direct and casual American English style.',
            region: { connect: { id: regionUS.id } }
        },
        create: {
            key: 'us-informal',
            style: 'Direct and casual American English style.',
            project: { connect: { id: projectId } },
            region: { connect: { id: regionUS.id } }
        }
    });
    console.log(`Upserted CulturalData for US (Key: ${culturalDataUS.key})`);

    return { regionUS, culturalDataUS };
}

