import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';
import { User, Project } from '@prisma/client';

describe('Environment Management E2E Tests', () => {
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
            where: { id: `test-tenant-env-${currentUniqueId}` },
            update: {},
            create: {
                id: `test-tenant-env-${currentUniqueId}`,
                name: `Test Tenant Environment ${currentUniqueId}`,
            },
        });

        // Crear usuario de prueba
        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
        testUser = await prisma.user.upsert({
            where: { email: `env-test-${currentUniqueId}@example.com` },
            update: {
                password: hashedPassword,
                tenantId: testTenant.id,
                role: 'admin',
            },
            create: {
                email: `env-test-${currentUniqueId}@example.com`,
                name: `Environment Test User ${currentUniqueId}`,
                password: hashedPassword,
                tenantId: testTenant.id,
                role: 'admin',
            },
        });

        // Obtener token de autenticación
        const loginResponse = await supertest(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: `env-test-${currentUniqueId}@example.com`,
                password: 'password123',
            });

        authToken = loginResponse.body.access_token;

        // Crear proyecto de prueba
        const projectResponse = await supertest(app.getHttpServer())
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: `Environment Test Project ${currentUniqueId}`,
                description: `Project for environment testing ${currentUniqueId}`,
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

    describe('Environment CRUD Operations', () => {
        it('should create a new environment successfully', async () => {
            const createEnvironmentDto = {
                name: 'development',
                description: 'Development environment for testing features',
            };

            const response = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('development');
            expect(response.body.description).toBe('Development environment for testing features');
            expect(response.body.projectId).toBe(testProject.id);
        });

        it('should fail to create environment with duplicate name', async () => {
            const createEnvironmentDto = {
                name: 'staging',
                description: 'Staging environment',
            };

            // Crear primer environment
            const firstResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto);

            expect(firstResponse.status).toBe(201);

            // Intentar crear environment con el mismo nombre
            const duplicateResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    ...createEnvironmentDto,
                    description: 'Different staging environment',
                });

            expect(duplicateResponse.status).toBe(409);
        });

        it('should retrieve all environments for a project', async () => {
            // Crear múltiples environments
            const environments = [
                {
                    name: 'development',
                    description: 'Development environment',
                },
                {
                    name: 'staging',
                    description: 'Staging environment',
                },
                {
                    name: 'production',
                    description: 'Production environment',
                },
            ];

            for (const env of environments) {
                await supertest(app.getHttpServer())
                    .post(`/projects/${testProject.id}/environments`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(env)
                    .expect(201);
            }

            // Obtener todos los environments
            const response = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveLength(3);
            expect(response.body.map((e: any) => e.name).sort()).toEqual([
                'development',
                'production',
                'staging',
            ]);
        });

        it('should retrieve a specific environment by ID', async () => {
            // Crear environment
            const createEnvironmentDto = {
                name: 'testing',
                description: 'Testing environment for QA',
            };

            const createResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto)
                .expect(201);

            const environmentId = createResponse.body.id;

            // Obtener environment específico
            const response = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments/${environmentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.id).toBe(environmentId);
            expect(response.body.name).toBe('testing');
            expect(response.body.description).toBe('Testing environment for QA');
        });

        it('should retrieve environment by name', async () => {
            // Crear environment
            const createEnvironmentDto = {
                name: 'preview',
                description: 'Preview environment for demos',
            };

            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto)
                .expect(201);

            // Obtener environment por nombre
            const response = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments/by-name/preview`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.name).toBe('preview');
            expect(response.body.description).toBe('Preview environment for demos');
        });

        it('should update an existing environment', async () => {
            // Crear environment
            const createEnvironmentDto = {
                name: 'beta',
                description: 'Beta testing environment',
            };

            const createResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto)
                .expect(201);

            const environmentId = createResponse.body.id;

            // Actualizar environment
            const updateDto = {
                name: 'beta-v2',
                description: 'Updated beta testing environment with new features',
            };

            const response = await supertest(app.getHttpServer())
                .patch(`/projects/${testProject.id}/environments/${environmentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.name).toBe('beta-v2');
            expect(response.body.description).toBe('Updated beta testing environment with new features');
            expect(response.body.id).toBe(environmentId); // ID no debe cambiar
        });

        it('should delete an existing environment', async () => {
            // Crear environment
            const createEnvironmentDto = {
                name: 'temporary',
                description: 'Temporary environment for testing',
            };

            const createResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto)
                .expect(201);

            const environmentId = createResponse.body.id;

            // Eliminar environment
            const deleteResponse = await supertest(app.getHttpServer())
                .delete(`/projects/${testProject.id}/environments/${environmentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(deleteResponse.body.id).toBe(environmentId);

            // Verificar que ya no existe
            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments/${environmentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 404 for non-existent environment', async () => {
            const nonExistentId = 'non-existent-env-id';

            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 404 for non-existent environment by name', async () => {
            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments/by-name/non-existent`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should validate required fields when creating environment', async () => {
            const invalidEnvironmentDto = {
                description: 'Missing name field',
            };

            const response = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidEnvironmentDto);

            expect(response.status).toBe(400);
        });

        it('should handle partial updates correctly', async () => {
            // Crear environment
            const createEnvironmentDto = {
                name: 'partial-update-test',
                description: 'Original description',
            };

            const createResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto)
                .expect(201);

            const environmentId = createResponse.body.id;

            // Actualizar solo la descripción
            const partialUpdateDto = {
                description: 'Updated description only',
            };

            const response = await supertest(app.getHttpServer())
                .patch(`/projects/${testProject.id}/environments/${environmentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(partialUpdateDto)
                .expect(200);

            expect(response.body.name).toBe('partial-update-test'); // No debe cambiar
            expect(response.body.description).toBe('Updated description only');
            expect(response.body.id).toBe(environmentId);
        });
    });

    describe('Environment Security and Authorization', () => {
        it('should require authentication for all operations', async () => {
            const createEnvironmentDto = {
                name: 'unauthorized-test',
                description: 'This should fail',
            };

            // Test sin token de autenticación
            await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/environments`)
                .send(createEnvironmentDto)
                .expect(401);

            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments`)
                .expect(401);
        });

        it('should prevent access to environments from different projects', async () => {
            // Crear otro proyecto
            const otherProjectResponse = await supertest(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: `Other Project ${currentUniqueId}`,
                    description: 'Another project for testing isolation',
                });

            const otherProject = otherProjectResponse.body;

            // Crear environment en el otro proyecto
            const createEnvironmentDto = {
                name: 'isolated-env',
                description: 'Environment in other project',
            };

            const envResponse = await supertest(app.getHttpServer())
                .post(`/projects/${otherProject.id}/environments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createEnvironmentDto)
                .expect(201);

            // Intentar acceder al environment desde el proyecto original (debería fallar)
            await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/environments/${envResponse.body.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });
}); 