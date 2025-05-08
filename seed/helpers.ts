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