import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';
import { User, Project } from '@prisma/client';

describe('Prompt Translations E2E Tests', () => {
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
            where: { id: `test-tenant-trans-${currentUniqueId}` },
            update: {},
            create: {
                id: `test-tenant-trans-${currentUniqueId}`,
                name: `Test Tenant Translations ${currentUniqueId}`,
            },
        });

        // Crear usuario de prueba
        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
        testUser = await prisma.user.upsert({
            where: { email: `trans-test-${currentUniqueId}@example.com` },
            update: {
                password: hashedPassword,
                tenantId: testTenant.id,
                role: 'admin',
            },
            create: {
                email: `trans-test-${currentUniqueId}@example.com`,
                name: `Translation Test User ${currentUniqueId}`,
                password: hashedPassword,
                tenantId: testTenant.id,
                role: 'admin',
            },
        });

        // Obtener token de autenticación
        const loginResponse = await supertest(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: `trans-test-${currentUniqueId}@example.com`,
                password: 'password123',
            });

        authToken = loginResponse.body.access_token;

        // Crear proyecto de prueba
        const projectResponse = await supertest(app.getHttpServer())
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: `Translation Test Project ${currentUniqueId}`,
                description: `Project for translation testing ${currentUniqueId}`,
            });

        testProject = projectResponse.body;

        // Crear regiones para las traducciones
        await supertest(app.getHttpServer())
            .post(`/projects/${testProject.id}/regions`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                languageCode: 'en-US',
                name: 'United States',
                timeZone: 'America/New_York',
                notes: 'Primary English region',
            });

        await supertest(app.getHttpServer())
            .post(`/projects/${testProject.id}/regions`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                languageCode: 'es-ES',
                name: 'Spain',
                timeZone: 'Europe/Madrid',
                notes: 'Spanish region',
            });

        await supertest(app.getHttpServer())
            .post(`/projects/${testProject.id}/regions`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                languageCode: 'fr-FR',
                name: 'France',
                timeZone: 'Europe/Paris',
                notes: 'French region',
            });
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

    describe('Prompt Translation Management', () => {
        it('should create prompt with initial translations', async () => {
            const createPromptDto = {
                name: 'Multilingual Welcome Prompt',
                description: 'A welcome prompt with multiple language support',
                promptText: 'Welcome to our application!',
                type: 'USER',
                initialTranslations: [
                    {
                        languageCode: 'es-ES',
                        promptText: '¡Bienvenido a nuestra aplicación!',
                    },
                    {
                        languageCode: 'fr-FR',
                        promptText: 'Bienvenue dans notre application!',
                    },
                ],
            };

            const response = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createPromptDto);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.versions).toHaveLength(1);
            expect(response.body.versions[0].translations).toHaveLength(2);

            const translations = response.body.versions[0].translations;
            expect(translations.find((t: any) => t.languageCode === 'es-ES')).toBeTruthy();
            expect(translations.find((t: any) => t.languageCode === 'fr-FR')).toBeTruthy();
        });

        it('should add translation to existing prompt version', async () => {
            // Crear prompt primero
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Prompt for Translation',
                    description: 'Prompt for testing translation addition',
                    promptText: 'Hello, world!',
                    type: 'SYSTEM',
                });

            expect(promptResponse.status).toBe(201);
            const promptId = promptResponse.body.id;
            const versionTag = promptResponse.body.versions[0].versionTag;

            // Añadir traducción española
            const translationResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/versions/${versionTag}/translations`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'es-ES',
                    promptText: '¡Hola, mundo!',
                });

            expect(translationResponse.status).toBe(201);
            expect(translationResponse.body.languageCode).toBe('es-ES');
            expect(translationResponse.body.promptText).toBe('¡Hola, mundo!');
        });

        it('should update existing translation', async () => {
            // Crear prompt con traducción inicial
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Update Translation Test',
                    description: 'Testing translation updates',
                    promptText: 'Original text',
                    type: 'USER',
                    initialTranslations: [
                        {
                            languageCode: 'es-ES',
                            promptText: 'Texto original',
                        },
                    ],
                });

            expect(promptResponse.status).toBe(201);
            const promptId = promptResponse.body.id;
            const versionTag = promptResponse.body.versions[0].versionTag;

            // Actualizar la traducción existente
            const updateResponse = await supertest(app.getHttpServer())
                .patch(`/projects/${testProject.id}/prompts/${promptId}/versions/${versionTag}/translations/es-ES`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    promptText: 'Texto actualizado',
                });

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.promptText).toBe('Texto actualizado');
        });

        it('should retrieve prompt version with all translations', async () => {
            // Crear prompt con múltiples traducciones
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Multilingual Test Prompt',
                    description: 'Testing multilingual retrieval',
                    promptText: 'Test message',
                    type: 'ASSISTANT',
                    initialTranslations: [
                        {
                            languageCode: 'es-ES',
                            promptText: 'Mensaje de prueba',
                        },
                        {
                            languageCode: 'fr-FR',
                            promptText: 'Message de test',
                        },
                    ],
                });

            expect(promptResponse.status).toBe(201);
            const promptId = promptResponse.body.id;

            // Obtener el prompt completo
            const getResponse = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/prompts/${promptId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(getResponse.body.versions).toHaveLength(1);
            expect(getResponse.body.versions[0].translations).toHaveLength(2);

            const translations = getResponse.body.versions[0].translations;
            const spanishTranslation = translations.find((t: any) => t.languageCode === 'es-ES');
            const frenchTranslation = translations.find((t: any) => t.languageCode === 'fr-FR');

            expect(spanishTranslation.promptText).toBe('Mensaje de prueba');
            expect(frenchTranslation.promptText).toBe('Message de test');
        });
    });

    describe('Asset Translation Management', () => {
        it('should create asset with initial translations', async () => {
            // Crear prompt primero
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Asset Translation Test Prompt',
                    description: 'Prompt for asset translation testing',
                    promptText: 'Welcome {{greeting}}',
                    type: 'USER',
                });

            expect(promptResponse.status).toBe(201);
            const promptId = promptResponse.body.id;

            // Crear asset con traducciones
            const assetResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/assets`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    key: 'greeting',
                    name: 'Greeting Asset',
                    initialValue: 'Hello there!',
                    tenantId: testUser.tenantId,
                    initialChangeMessage: 'Initial greeting asset',
                    initialTranslations: [
                        {
                            languageCode: 'es-ES',
                            value: '¡Hola!',
                        },
                        {
                            languageCode: 'fr-FR',
                            value: 'Salut!',
                        },
                    ],
                });

            expect(assetResponse.status).toBe(201);
            expect(assetResponse.body.key).toBe('greeting');

            // Verificar que se crearon las traducciones
            const assetVersionResponse = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/prompts/${promptId}/assets/${assetResponse.body.key}/versions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(assetVersionResponse.body).toHaveLength(1);
            const version = assetVersionResponse.body[0];
            expect(version.translations).toHaveLength(2);

            const spanishTranslation = version.translations.find((t: any) => t.languageCode === 'es-ES');
            const frenchTranslation = version.translations.find((t: any) => t.languageCode === 'fr-FR');

            expect(spanishTranslation.value).toBe('¡Hola!');
            expect(frenchTranslation.value).toBe('Salut!');
        });

        it('should add translation to existing asset version', async () => {
            // Crear prompt y asset primero
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Add Asset Translation Test',
                    description: 'Testing asset translation addition',
                    promptText: 'Say {{farewell}}',
                    type: 'ASSISTANT',
                });

            const promptId = promptResponse.body.id;

            const assetResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/assets`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    key: 'farewell',
                    name: 'Farewell Asset',
                    initialValue: 'Goodbye!',
                    tenantId: testUser.tenantId,
                    initialChangeMessage: 'Initial farewell asset',
                });

            expect(assetResponse.status).toBe(201);
            const assetKey = assetResponse.body.key;

            // Obtener la versión del asset
            const versionsResponse = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/prompts/${promptId}/assets/${assetKey}/versions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const versionTag = versionsResponse.body[0].versionTag;

            // Añadir traducción española
            const translationResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/assets/${assetKey}/versions/${versionTag}/translations`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'es-ES',
                    value: '¡Adiós!',
                });

            expect(translationResponse.status).toBe(201);
            expect(translationResponse.body.languageCode).toBe('es-ES');
            expect(translationResponse.body.value).toBe('¡Adiós!');
        });

        it('should update existing asset translation', async () => {
            // Crear prompt y asset con traducción inicial
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Update Asset Translation Test',
                    description: 'Testing asset translation updates',
                    promptText: 'Please {{action}}',
                    type: 'SYSTEM',
                });

            const promptId = promptResponse.body.id;

            const assetResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/assets`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    key: 'action',
                    name: 'Action Asset',
                    initialValue: 'click here',
                    tenantId: testUser.tenantId,
                    initialChangeMessage: 'Initial action asset',
                    initialTranslations: [
                        {
                            languageCode: 'es-ES',
                            value: 'haz clic aquí',
                        },
                    ],
                });

            expect(assetResponse.status).toBe(201);
            const assetKey = assetResponse.body.key;

            // Obtener la versión del asset
            const versionsResponse = await supertest(app.getHttpServer())
                .get(`/projects/${testProject.id}/prompts/${promptId}/assets/${assetKey}/versions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const versionTag = versionsResponse.body[0].versionTag;

            // Actualizar la traducción existente
            const updateResponse = await supertest(app.getHttpServer())
                .patch(`/projects/${testProject.id}/prompts/${promptId}/assets/${assetKey}/versions/${versionTag}/translations/es-ES`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    value: 'presiona aquí',
                });

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.value).toBe('presiona aquí');
        });
    });

    describe('Translation Validation and Error Handling', () => {
        it('should validate language code format', async () => {
            // Crear prompt primero
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Validation Test Prompt',
                    description: 'Testing validation',
                    promptText: 'Test text',
                    type: 'USER',
                });

            const promptId = promptResponse.body.id;
            const versionTag = promptResponse.body.versions[0].versionTag;

            // Intentar crear traducción con código de idioma inválido
            const invalidResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/versions/${versionTag}/translations`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'invalid-code',
                    promptText: 'Invalid translation',
                });

            expect(invalidResponse.status).toBe(400);
        });

        it('should require valid prompt version for translation', async () => {
            // Crear prompt primero
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Version Test Prompt',
                    description: 'Testing version validation',
                    promptText: 'Test text',
                    type: 'USER',
                });

            const promptId = promptResponse.body.id;
            const invalidVersionTag = 'invalid-version-tag';

            // Intentar crear traducción para versión inexistente
            const invalidResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/versions/${invalidVersionTag}/translations`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'es-ES',
                    promptText: 'Valid text but invalid version',
                });

            expect(invalidResponse.status).toBe(404);
        });

        it('should require non-empty translation text', async () => {
            // Crear prompt primero
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Empty Text Test Prompt',
                    description: 'Testing empty text validation',
                    promptText: 'Test text',
                    type: 'USER',
                });

            const promptId = promptResponse.body.id;
            const versionTag = promptResponse.body.versions[0].versionTag;

            // Intentar crear traducción con texto vacío
            const emptyResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts/${promptId}/versions/${versionTag}/translations`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    languageCode: 'es-ES',
                    promptText: '',
                });

            expect(emptyResponse.status).toBe(400);
        });
    });

    describe('Cross-Language Content Consistency', () => {
        it('should maintain variable placeholders across translations', async () => {
            // Crear prompt con variables
            const promptResponse = await supertest(app.getHttpServer())
                .post(`/projects/${testProject.id}/prompts`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Variable Consistency Test',
                    description: 'Testing variable consistency in translations',
                    promptText: 'Hello {{user_name}}, your balance is {{amount}}',
                    type: 'USER',
                    initialTranslations: [
                        {
                            languageCode: 'es-ES',
                            promptText: 'Hola {{user_name}}, tu saldo es {{amount}}',
                        },
                        {
                            languageCode: 'fr-FR',
                            promptText: 'Bonjour {{user_name}}, votre solde est {{amount}}',
                        },
                    ],
                });

            expect(promptResponse.status).toBe(201);

            // Verificar que todas las traducciones mantienen las variables
            const translations = promptResponse.body.versions[0].translations;

            translations.forEach((translation: any) => {
                expect(translation.promptText).toContain('{{user_name}}');
                expect(translation.promptText).toContain('{{amount}}');
            });
        });
    });
}); 