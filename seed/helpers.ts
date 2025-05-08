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
            timeZone: 'Europe/Madrid',
            defaultFormalityLevel: 'Formal'
        },
        create: {
            languageCode: 'es-ES',
            name: 'España',
            timeZone: 'Europe/Madrid',
            defaultFormalityLevel: 'Formal',
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
            formalityLevel: 8,
            style: 'Lenguaje formal y directo común en el español de negocios.',
            considerations: 'Respetar la jerarquía y el protocolo. Usar "usted" en contextos formales.',
            region: { connect: { id: regionES.id } }
        },
        create: {
            key: 'es-formal',
            formalityLevel: 8,
            style: 'Lenguaje formal y directo común en el español de negocios.',
            considerations: 'Respetar la jerarquía y el protocolo. Usar "usted" en contextos formales.',
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
            timeZone: 'America/New_York',
            defaultFormalityLevel: 'Informal'
        },
        create: {
            languageCode: 'en-US',
            name: 'United States',
            timeZone: 'America/New_York',
            defaultFormalityLevel: 'Informal',
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
            formalityLevel: 3,
            style: 'Direct and casual American English style.',
            considerations: 'Use contractions and informal expressions. Avoid overly formal language.',
            region: { connect: { id: regionUS.id } }
        },
        create: {
            key: 'us-informal',
            formalityLevel: 3,
            style: 'Direct and casual American English style.',
            considerations: 'Use contractions and informal expressions. Avoid overly formal language.',
            project: { connect: { id: projectId } },
            region: { connect: { id: regionUS.id } }
        }
    });
    console.log(`Upserted CulturalData for US (Key: ${culturalDataUS.key})`);

    return { regionUS, culturalDataUS };
} 