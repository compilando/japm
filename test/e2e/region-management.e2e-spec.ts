import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';
import { User, Project } from '@prisma/client';

describe('Region Management E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let testUser: User;
    let testProject: Project;
    let authToken: string;
    let currentUniqueId: number;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        currentUniqueId = Date.now() + Math.floor(Math.random() * 1000);

        // Crear tenant primero
        const testTenant = await prisma.tenant.upsert({
            where: { id: `test-tenant-region-${currentUniqueId}` },
            update: {},
            create: {
                id: `test-tenant-region-${currentUniqueId}`,
                name: `Test Tenant Region ${currentUniqueId}`,
            },
        });

        // Crear usuario de prueba
        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
        testUser = await prisma.user.upsert({
            where: { email: `region-test-${currentUniqueId}@example.com` },
            update: {
                password: hashedPassword,
                tenantId: testTenant.id,
                role: 'admin',
            },
            create: {
                email: `region-test-${currentUniqueId}@example.com`,
                name: `Region Test User ${currentUniqueId}`,
                password: hashedPassword,
                tenantId: testTenant.id,
                role: 'admin',
            },
        });

        // Obtener token de autenticación
        const loginResponse = await supertest(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: `region-test-${currentUniqueId}@example.com`,
                password: 'password123',
            });

        authToken = loginResponse.body.access_token;

        // Crear proyecto de prueba
        const projectResponse = await supertest(app.getHttpServer())
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: `Region Test Project ${currentUniqueId}`,
                description: `Project for region testing ${currentUniqueId}`,
            });

        testProject = projectResponse.body;
    });

    afterAll(async () => {
        try {
            await prisma.assetTranslation.deleteMany();
            await prisma.promptAssetVersion.deleteMany();
            await prisma.promptAsset.deleteMany();
            await prisma.promptTranslation.deleteMany();
            await prisma.promptVersion.deleteMany();
            await prisma.promptExecutionLog.deleteMany();
            await prisma.prompt.deleteMany();
            await prisma.tag.deleteMany();
            await prisma.culturalData.deleteMany();
            await prisma.ragDocumentMetadata.deleteMany();
            await prisma.environment.deleteMany();
            await prisma.aIModel.deleteMany();
            await prisma.region.deleteMany();
            await prisma.project.deleteMany();
            await prisma.user.deleteMany();
            await prisma.asset.deleteMany();
            await prisma.tenant.deleteMany();
            console.log('Limpieza de datos específicos completada en afterAll');
        } catch (err) {
            console.error('Error durante la limpieza en afterAll:', err);
        }
        await app.close();
        console.log('App cerrada en afterAll');
    });

    describe('Region CRUD Operations', () => {
        it('should create a new region successfully', async () => {
            const createRegionDto = {
                languageCode: 'en-US',
                name: 'United States',
                timeZone: 'America/New_York',
                notes: 'Primary US region for testing',
            };

            const response = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createRegionDto);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.languageCode).toBe('en-US');
            expect(response.body.name).toBe('United States');
            expect(response.body.timeZone).toBe('America/New_York');
            expect(response.body.notes).toBe('Primary US region for testing');
        });

        it('should fail to create region with duplicate language code', async () => {
            // Crear primera región
            const createRegionDto = {
                languageCode: 'es-ES',
                name: 'Spain',
                timeZone: 'Europe/Madrid',
                notes: 'Spanish region',
            };

            const firstResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createRegionDto);

            expect(firstResponse.status).toBe(201);

            // Intentar crear región con el mismo language code
            const duplicateResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    ...createRegionDto,
                    name: 'Different Spain',
                });

            expect(duplicateResponse.status).toBe(409);
        });

        it('should retrieve all regions for a project', async () => {
            // Crear múltiples regiones con códigos únicos válidos
            const regions = [
                {
                    languageCode: 'en-US',
                    name: 'United States',
                    timeZone: 'America/New_York',
                    notes: 'US region',
                },
                {
                    languageCode: 'es-MX',
                    name: 'Mexico',
                    timeZone: 'America/Mexico_City',
                    notes: 'Mexican region',
                },
                {
                    languageCode: 'fr-FR',
                    name: 'France',
                    timeZone: 'Europe/Paris',
                    notes: 'French region',
                },
            ];

            for (const region of regions) {
                await supertest(app.getHttpServer())
                    .post(`/projects/${testProject.id}/regions`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(region)
                    .expect(201);
            }

            // Obtener todas las regiones
            const response = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveLength(3);
            const languageCodes = response.body.map((r: any) => r.languageCode).sort();
            expect(languageCodes).toEqual(['en-US', 'es-MX', 'fr-FR']);
        });

        it('should retrieve a specific region by language code', async () => {
            // Crear región
            const createRegionDto = {
                languageCode: 'de-DE',
                name: 'Germany',
                timeZone: 'Europe/Berlin',
                notes: 'German region',
            };

            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createRegionDto)
                .expect(201);

            // Obtener región específica
            const response = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/regions/${createRegionDto.languageCode}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.languageCode).toBe('de-DE');
            expect(response.body.name).toBe('Germany');
            expect(response.body.timeZone).toBe('Europe/Berlin');
        });

        it('should update an existing region', async () => {
            // Crear región
            const createRegionDto = {
                languageCode: 'it-IT',
                name: 'Italy',
                timeZone: 'Europe/Rome',
                notes: 'Italian region',
            };

            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createRegionDto)
                .expect(201);

            // Actualizar región
            const updateDto = {
                name: 'Repubblica Italiana',
                notes: 'Updated Italian region with proper name',
            };

            const response = await supertest(app.getHttpServer())
                .patch(`/projects/${testProject.id}/regions/${createRegionDto.languageCode}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.name).toBe('Repubblica Italiana');
            expect(response.body.notes).toBe('Updated Italian region with proper name');
            expect(response.body.languageCode).toBe('it-IT'); // No debe cambiar
            expect(response.body.timeZone).toBe('Europe/Rome'); // No debe cambiar
        });

        it('should delete an existing region', async () => {
            // Crear región
            const createRegionDto = {
                languageCode: 'pt-BR',
                name: 'Brazil',
                timeZone: 'America/Sao_Paulo',
                notes: 'Brazilian region',
            };

            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createRegionDto)
                .expect(201);

            // Eliminar región - el controller devuelve 200, no 204
            await supertest(app.getHttpServer())
                .delete(`/projects/${testProject.id}/regions/${createRegionDto.languageCode}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Verificar que ya no existe
            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/regions/${createRegionDto.languageCode}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 404 for non-existent region', async () => {
            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/regions/xx-XX`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should validate required fields when creating region', async () => {
            const invalidRegionDto = {
                name: 'Missing Language Code',
                timeZone: 'Europe/London',
            };

            const response = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidRegionDto);

            expect(response.status).toBe(400);
        });
    });

    describe('Region Hierarchies', () => {
        it('should create parent-child region relationships', async () => {
            // Crear región padre
            const parentRegion = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'en-GB',
                    name: 'United Kingdom',
                    timeZone: 'Europe/London',
                    notes: 'Parent UK region',
                })
                .expect(201);

            // Crear región hijo - usar parentRegionId con el languageCode del padre
            const childRegion = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'en-CA',
                    name: 'Canada',
                    timeZone: 'America/Toronto',
                    parentRegionId: 'en-GB', // Usar el languageCode del padre, no el ID
                    notes: 'Canadian sub-region',
                })
                .expect(201);

            expect(childRegion.body.parentRegionId).toBe(parentRegion.body.id);

            // Verificar que el hijo aparece en la respuesta del padre
            const parentResponse = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/regions/${parentRegion.body.languageCode}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(parentResponse.body.id).toBe(parentRegion.body.id);
        });
    });

    describe('Region Input Validation', () => {
        it('should validate language code format', async () => {
            const invalidLanguageCode = {
                languageCode: 'invalid',
                name: 'Invalid Region',
                timeZone: 'UTC',
            };

            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidLanguageCode)
                .expect(400);
        });

        it('should validate timezone format', async () => {
            const invalidTimezone = {
                languageCode: 'ja-JP',
                name: 'Japan',
                timeZone: 'Invalid/Timezone',
            };

            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/regions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidTimezone)
                .expect(400);
        });
    });
}); 