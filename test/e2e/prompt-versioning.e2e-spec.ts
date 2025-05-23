import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@prisma/client';
import { Response } from 'supertest';
import * as bcrypt from 'bcrypt';

interface PromptResponse extends Response {
  body: {
    id: string;
  };
}

describe('Prompt Versioning E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testTenant: { id: string };
  let testUser: { id: string; tenantId: string };
  let testProject: { id: string };
  let guardPrompt: PromptResponse;
  let codegenPrompt: PromptResponse;
  let authToken: string;
  let currentUniqueId: number; // Para trackear el ID actual

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Usar IDs únicos para evitar conflictos entre tests
    currentUniqueId = Date.now();

    // Crear tenant primero
    testTenant = await prisma.tenant.upsert({
      where: { id: `test-tenant-id-3-${currentUniqueId}` },
      update: {},
      create: {
        id: `test-tenant-id-3-${currentUniqueId}`,
        name: `Test Tenant 3 ${currentUniqueId}`,
      },
    });

    // Crear usuario
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    testUser = await prisma.user.upsert({
      where: { email: `test3-${currentUniqueId}@example.com` },
      update: {
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
      create: {
        email: `test3-${currentUniqueId}@example.com`,
        name: `Test User 3 ${currentUniqueId}`,
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
    });

    // Crear proyecto
    testProject = await prisma.project.upsert({
      where: { id: `test-project-3-${currentUniqueId}` },
      update: {
        name: `Test Project 3 ${currentUniqueId}`,
        description: `Project 3 for E2E testing ${currentUniqueId}`,
        ownerUserId: testUser.id,
        tenantId: testTenant.id,
      },
      create: {
        id: `test-project-3-${currentUniqueId}`,
        name: `Test Project 3 ${currentUniqueId}`,
        description: `Project 3 for E2E testing ${currentUniqueId}`,
        ownerUserId: testUser.id,
        tenantId: testTenant.id,
      },
    });

    // Crear regiones
    await prisma.region.upsert({
      where: { id: `es-ES-3-${currentUniqueId}` },
      update: {},
      create: {
        id: `es-ES-3-${currentUniqueId}`,
        name: `Spain 3 ${currentUniqueId}`,
        languageCode: 'es-ES',
        projectId: testProject.id,
      },
    });

    await prisma.region.upsert({
      where: { id: `en-US-3-${currentUniqueId}` },
      update: {},
      create: {
        id: `en-US-3-${currentUniqueId}`,
        name: `United States 3 ${currentUniqueId}`,
        languageCode: 'en-US',
        projectId: testProject.id,
      },
    });

    // Simular login para obtener token JWT
    const loginResponse = await supertest(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `test3-${currentUniqueId}@example.com`,
        password: 'password123',
      });

    if (!loginResponse.body.access_token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    try {
      // Limpiar datos usando limpieza global que maneja las dependencias correctamente
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

  describe('Prompt Versioning', () => {
    it('should create and manage prompt versions correctly', async () => {
      // 1. Crear proyecto
      const projectResponse = await supertest(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project 3',
          description: 'Project 3 for E2E testing',
        });

      expect(projectResponse.status).toBe(201);
      const testProject = projectResponse.body;

      // 2. Crear prompt base
      const basePromptResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Base Prompt 3',
          description: 'Base prompt 3 for testing',
          promptText: 'This is a base prompt with {{asset1-3}} and {{asset2-3}}',
          type: 'SYSTEM',
        });

      expect(basePromptResponse.status).toBe(201);
      console.log('Respuesta al crear base prompt:', basePromptResponse.status, basePromptResponse.body, basePromptResponse.text);

      // Verificar que se creó automáticamente la versión 1.0.0
      expect(basePromptResponse.body.versions).toHaveLength(1);
      expect(basePromptResponse.body.versions[0].versionTag).toBe('1.0.0');

      // 3. Crear nueva versión (no 1.0.0, que ya existe)
      const versionResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePromptResponse.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          promptText: 'This is a base prompt with {{asset1-3}} and {{asset2-3}}',
          languageCode: 'en-US',
          versionTag: '1.0.1',
          changeMessage: 'Version 1.0.1 created.',
        });

      expect(versionResponse.status).toBe(201);
      console.log('Versión del prompt creada:', versionResponse.body);

      // 4. Verificar que la versión existe
      const versionExists = await prisma.promptVersion.findUnique({
        where: { id: versionResponse.body.id },
      });
      console.log('Versión existe:', versionExists);

      // 5. Crear otra nueva versión
      const newVersionResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePromptResponse.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          promptText: 'This is an updated base prompt with {{asset1-3}} and {{asset2-3}}',
          languageCode: 'en-US',
          versionTag: '1.0.2',
          changeMessage: 'Version 1.0.2 created with updates.',
        });

      expect(newVersionResponse.status).toBe(201);
      expect(newVersionResponse.body.versionTag).toBe('1.0.2');

      // 6. Obtener historial de versiones
      const historyResponse = await supertest(app.getHttpServer())
        .get(`/projects/${testProject.id}/prompts/${basePromptResponse.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveLength(3); // 1.0.0 (auto), 1.0.1, 1.0.2
      expect(historyResponse.body.map(v => v.versionTag).sort()).toEqual(['1.0.0', '1.0.1', '1.0.2']);
    });

    it('should handle version conflicts correctly', async () => {
      // 1. Crear proyecto
      const projectResponse = await supertest(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project 4',
          description: 'Project 4 for E2E testing',
        });

      expect(projectResponse.status).toBe(201);
      const testProject = projectResponse.body;

      // 2. Crear prompt base
      const basePromptResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Base Prompt 4',
          description: 'Base prompt 4 for testing',
          promptText: 'This is a base prompt with {{asset1-4}} and {{asset2-4}}',
          type: 'SYSTEM',
        });

      expect(basePromptResponse.status).toBe(201);

      // 3. Crear versión inicial diferente de 1.0.0
      const versionResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePromptResponse.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          promptText: 'This is a base prompt with {{asset1-4}} and {{asset2-4}}',
          languageCode: 'en-US',
          versionTag: '2.0.0',
          changeMessage: 'Version 2.0.0 created.',
        });

      expect(versionResponse.status).toBe(201);

      // 4. Intentar crear versión con el mismo tag
      const conflictResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePromptResponse.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          promptText: 'This is a conflicting version',
          languageCode: 'en-US',
          versionTag: '2.0.0',
          changeMessage: 'Attempting to create conflicting version.',
        });

      expect(conflictResponse.status).toBe(409);
      expect(conflictResponse.body.message).toContain('already exists');
    });
  });
}); 