import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';

describe('Prompt Creation E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: { id: string; tenantId: string };
  let testProject: { id: string; ownerUserId: string };
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Crear usuario de prueba
    testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$10$ZtNGKUNW4XlkfIkDL4Fo1OzwhpocZqi0pP/DTKOYM0OQitvJIqAra', // hash de 'Password123!'
        tenantId: 'test-tenant-id',
        role: 'admin',
      },
    });

    // Simular login para obtener token JWT
    const loginResponse = await supertest(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      });
    console.log('Login response:', loginResponse.body);
    authToken = loginResponse.body.access_token;

    // Crear proyecto de prueba
    testProject = await prisma.project.upsert({
      where: { id: 'test-project' },
      update: {},
      create: {
        id: 'test-project',
        name: 'Test Project',
        description: 'Project for E2E testing',
        ownerUserId: testUser.id,
        tenantId: testUser.tenantId,
      },
    });
    console.log('Test user ID:', testUser.id);
    console.log('Test project ownerUserId:', testProject.ownerUserId);
  });

  afterAll(async () => {
    // Limpiar datos de prueba en orden inverso a las dependencias
    await prisma.promptExecutionLog.deleteMany({ where: { projectId: testProject.id } });
    const assetIds = (await prisma.promptAsset.findMany({ where: { projectId: testProject.id }, select: { id: true } })).map(a => a.id);
    await prisma.promptAssetVersion.deleteMany({ where: { assetId: { in: assetIds } } });
    await prisma.promptAsset.deleteMany({ where: { projectId: testProject.id } });
    const versionIds = (await prisma.promptVersion.findMany({ where: { prompt: { projectId: testProject.id } }, select: { id: true } })).map(v => v.id);
    await prisma.promptTranslation.deleteMany({ where: { versionId: { in: versionIds } } });
    await prisma.promptVersion.deleteMany({ where: { prompt: { projectId: testProject.id } } });
    await prisma.prompt.deleteMany({ where: { projectId: testProject.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    // No eliminamos el usuario ya que puede tener otras referencias
    await app.close();
  });

  describe('Prompt Asset Creation', () => {
    it('should create a prompt asset with initial version', async () => {
      // 1. Crear prompt base
      const response = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-prompt',
          type: 'SYSTEM',
          promptText: 'This is a test prompt with {{saludo}}',
        });

      // 2. Crear asset con versión inicial
      const assetResponse = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${response.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'saludo',
          name: 'Saludo Formal',
          category: 'Saludos',
          initialValue: 'Buenos días',
          initialChangeMessage: 'Versión inicial del saludo',
          tenantId: testUser.tenantId,
        })
        .expect(201);

      // Verificar la respuesta
      expect(assetResponse.body).toHaveProperty('id');
      expect(assetResponse.body.key).toBe('saludo');
      expect(assetResponse.body.name).toBe('Saludo Formal');
      expect(assetResponse.body.category).toBe('Saludos');
      expect(assetResponse.body.versions).toHaveLength(1);
      expect(assetResponse.body.versions[0].value).toBe('Buenos días');
      expect(assetResponse.body.versions[0].changeMessage).toBe('Versión inicial del saludo');
    });

    it('should fail when creating an asset with duplicate key', async () => {
      // 1. Crear prompt base
      const response = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-prompt',
          type: 'SYSTEM',
          promptText: 'This is a test prompt with {{saludo}}',
        });

      // 2. Crear primer asset
      await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${response.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'saludo',
          name: 'Saludo Formal',
          initialValue: 'Buenos días',
          tenantId: testUser.tenantId,
        })
        .expect(201);

      // 3. Intentar crear asset con la misma key
      const duplicateResponse = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${response.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'saludo',
          name: 'Otro Saludo',
          initialValue: 'Hola',
          tenantId: testUser.tenantId,
        })
        .expect(409);

      expect(duplicateResponse.body.message).toContain('ya existe un asset con esa key');
    });

    it('should fail when creating an asset with invalid data', async () => {
      // 1. Crear prompt base
      const response = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-prompt',
          type: 'SYSTEM',
          promptText: 'This is a test prompt with {{saludo}}',
        });

      // 2. Intentar crear asset con datos inválidos
      const invalidResponse = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${response.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: '', // key vacía
          name: '', // nombre vacío
          initialValue: '', // valor inicial vacío
          tenantId: testUser.tenantId,
        })
        .expect(400);

      expect(invalidResponse.body.message).toContain('error de validación');
    });
  });
}); 