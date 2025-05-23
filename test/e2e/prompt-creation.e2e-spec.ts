import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';
import { User, Project } from '@prisma/client';

describe('Prompt Creation E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: User;
  let testProject: Project;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Crear tenant primero
    const testTenant = await prisma.tenant.upsert({
      where: { id: 'test-tenant-id-5' },
      update: {},
      create: {
        id: 'test-tenant-id-5',
        name: 'Test Tenant 5',
      },
    });

    // Crear usuario de prueba
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    testUser = await prisma.user.upsert({
      where: { email: 'test5@example.com' },
      update: {
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
      create: {
        email: 'test5@example.com',
        name: 'Test User 5',
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
    });

    // Obtener token de autenticación
    const loginResponse = await supertest(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test5@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;

    // Crear el proyecto por defecto
    testProject = await prisma.project.upsert({
      where: { id: 'default-project' },
      update: {
        name: 'Default Project',
        tenantId: testTenant.id,
        ownerUserId: testUser.id,
      },
      create: {
        id: 'default-project',
        name: 'Default Project',
        tenantId: testTenant.id,
        ownerUserId: testUser.id,
      },
    });
  });

  afterAll(async () => {
    try {
      // Limpiar datos específicos de este test en el orden correcto
      // Usar la limpieza global que ya maneja las dependencias correctamente
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

  describe('Prompt Asset Creation', () => {
    it('should create a prompt asset with initial version', async () => {
      try {
        // 1. Crear proyecto
        const response = await supertest(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Project 5',
            description: 'Project 5 for E2E testing',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');

        // 2. Crear prompt base primero
        const promptResponse = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Prompt for Assets',
            description: 'Prompt for testing assets',
            promptText: 'This is a test prompt with {{test-asset}}',
            type: 'SYSTEM',
          });

        expect(promptResponse.status).toBe(201);
        expect(promptResponse.body).toHaveProperty('id');

        // 3. Crear asset con versión inicial usando el endpoint correcto
        const assetResponse = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts/${promptResponse.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: 'test-asset',
            name: 'Test Asset',
            initialValue: 'Hello, world!',
            tenantId: testUser.tenantId,
            initialChangeMessage: 'Versión inicial del saludo',
          });

        expect(assetResponse.status).toBe(201);
        expect(assetResponse.body).toHaveProperty('id');
        expect(assetResponse.body).toHaveProperty('key', 'test-asset');
      } catch (error) {
        console.error('Error en el test:', error);
        throw error;
      }
    });

    it('should fail when creating an asset with duplicate key', async () => {
      try {
        // 1. Crear proyecto
        const response = await supertest(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Project 6',
            description: 'Project 6 for E2E testing',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');

        // 2. Crear prompt base
        const promptResponse = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Prompt for Duplicate Assets',
            description: 'Prompt for testing duplicate assets',
            promptText: 'This is a test prompt with {{duplicate-asset}}',
            type: 'SYSTEM',
          });

        expect(promptResponse.status).toBe(201);

        // 3. Crear primer asset
        const asset1 = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts/${promptResponse.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: 'duplicate-asset',
            name: 'Duplicate Asset',
            initialValue: 'Hello, world!',
            tenantId: testUser.tenantId,
            initialChangeMessage: 'Versión inicial del saludo',
          });

        expect(asset1.status).toBe(201);

        // 4. Intentar crear asset con la misma key
        const asset2 = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts/${promptResponse.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: 'duplicate-asset',
            name: 'Duplicate Asset 2',
            initialValue: 'Hello, world again!',
            tenantId: testUser.tenantId,
            initialChangeMessage: 'Intento de duplicar asset',
          });

        expect(asset2.status).toBe(409);
      } catch (error) {
        console.error('Error en el test:', error);
        throw error;
      }
    });

    it('should fail when creating an asset with invalid data', async () => {
      try {
        // 1. Crear proyecto
        const response = await supertest(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Project 7',
            description: 'Project 7 for E2E testing',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');

        // 2. Crear prompt base
        const promptResponse = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Prompt for Invalid Assets',
            description: 'Prompt for testing invalid assets',
            promptText: 'This is a test prompt with {{invalid-asset}}',
            type: 'SYSTEM',
          });

        expect(promptResponse.status).toBe(201);

        // 3. Intentar crear asset con datos inválidos (sin key)
        const invalidResponse = await supertest(app.getHttpServer())
          .post(`/projects/${response.body.id}/prompts/${promptResponse.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Invalid Asset',
            initialValue: '',
            tenantId: testUser.tenantId,
            initialChangeMessage: 'Versión inicial inválida',
          });

        expect(invalidResponse.status).toBe(400);
      } catch (error) {
        console.error('Error en el test:', error);
        throw error;
      }
    });
  });
}); 