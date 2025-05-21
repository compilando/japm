import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

describe('Prompt Hierarchy E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: { id: string; tenantId: string };
  let testProject: { id: string };
  let authToken: string;
  let testTenant;
  let SALT_ROUNDS;
  let hashedPassword;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.assetTranslation.deleteMany();
        await tx.promptAssetVersion.deleteMany();
        await tx.promptAsset.deleteMany();
        await tx.promptTranslation.deleteMany();
        await tx.promptVersion.deleteMany();
        await tx.promptExecutionLog.deleteMany();
        await tx.prompt.deleteMany();
        await tx.tag.deleteMany();
        await tx.culturalData.deleteMany();
        await tx.ragDocumentMetadata.deleteMany();
        await tx.environment.deleteMany();
        await tx.aIModel.deleteMany();
        await tx.region.deleteMany();
        await tx.project.deleteMany();
        await tx.user.deleteMany();
        await tx.asset.deleteMany();
        await tx.tenant.deleteMany();
      });
      console.log('Limpieza de base de datos completada en beforeEach');
    } catch (err) {
      console.error('Error durante la limpieza en beforeEach:', err);
      throw err;
    }
  });

  afterAll(async () => {
    await app.close();
    console.log('App cerrada en afterAll');
  });

  describe('Prompt Creation and Resolution', () => {
    it('should create a complete prompt hierarchy and resolve it correctly', async () => {
      // Crear tenant primero
      const testTenant = await prisma.tenant.upsert({
        where: { id: 'test-tenant-id-2' },
        update: {},
        create: {
          id: 'test-tenant-id-2',
          name: 'Test Tenant 2',
        },
      });
      // Crear usuario de prueba
      const SALT_ROUNDS = 10;
      const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
      const testUser = await prisma.user.upsert({
        where: { email: 'test2@example.com' },
        update: {},
        create: {
          email: 'test2@example.com',
          name: 'Test User 2',
          password: hashedPassword,
          tenantId: testTenant.id,
          role: 'admin',
        },
      });
      // Simular login para obtener token JWT
      const loginResponse = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'password123',
        });
      if (!loginResponse.body.access_token) {
        console.error('No se pudo obtener el token de autenticación', loginResponse.body);
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const authToken = loginResponse.body.access_token;
      console.log('Token obtenido:', authToken);
      // Crear proyecto de prueba
      const testProject = await prisma.project.upsert({
        where: { id: 'test-project-2' },
        update: {},
        create: {
          id: 'test-project-2',
          name: 'Test Project 2',
          description: 'Project 2 for E2E testing',
          ownerUserId: testUser.id,
          tenantId: testUser.tenantId,
        },
      });
      console.log('Proyecto creado:', testProject);
      // 1. Crear prompt base
      const basePromptRes = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'test-base-prompt-2',
          name: 'Test Base Prompt 2',
          description: 'Base prompt 2 for testing',
          promptText: 'This is a base prompt with {{asset1-2}} and {{asset2-2}}',
          type: 'SYSTEM',
        });
      console.log('Respuesta al crear base prompt:', basePromptRes.status, basePromptRes.body, basePromptRes.text);
      expect(basePromptRes.status).toBe(201);
      const basePrompt = basePromptRes;

      // 2. Crear assets
      const asset1 = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePrompt.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'asset1-2',
          name: 'Asset 1-2',
          category: 'Test Category',
          initialValue: 'This is asset 1-2',
          initialChangeMessage: 'Versión inicial del asset 1-2',
          tenantId: testUser.tenantId,
        })
        .expect(201);

      const asset2 = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePrompt.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'asset2-2',
          name: 'Asset 2-2',
          category: 'Test Category',
          initialValue: 'This is asset 2-2',
          initialChangeMessage: 'Versión inicial del asset 2-2',
          tenantId: testUser.tenantId,
        })
        .expect(201);

      // 3. Crear versión del prompt
      const promptVersion = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePrompt.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionTag: '1.0.1',
          promptText: 'This is a base prompt with {{asset1-2}} and {{asset2-2}}',
        })
        .expect(201);
      console.log('Versión del prompt creada:', promptVersion.body);

      // Verificar que la versión existe antes de crear la traducción
      const versionExists = await prisma.promptVersion.findUnique({
        where: { id: promptVersion.body.id },
      });
      console.log('Versión existe:', versionExists);

      // 4. Crear traducción
      const translation = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePrompt.body.id}/versions/${promptVersion.body.id}/translations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          languageCode: 'es-ES',
          promptText: 'Este es un prompt base con {{asset1-2}} y {{asset2-2}}',
        })
        .expect(201);

      // 5. Probar resolución del prompt
      const resolvedPrompt = await supertest(app.getHttpServer())
        .post(`/serve-prompt/execute/${testProject.id}/test-base-prompt-2/1.0.0/base`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(resolvedPrompt.body.promptText).toBe(
        'This is a base prompt with This is asset 1-2 and This is asset 2-2',
      );

      // 6. Probar resolución del prompt en español
      const resolvedPromptEs = await supertest(app.getHttpServer())
        .post(`/serve-prompt/execute/${testProject.id}/test-base-prompt-2/1.0.0/lang/es-ES`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(resolvedPromptEs.body.promptText).toBe(
        'Este es un prompt base con This is asset 1-2 y This is asset 2-2',
      );
    });

    it('should handle circular references correctly', async () => {
      // Crear tenant primero
      const testTenant = await prisma.tenant.upsert({
        where: { id: 'test-tenant-id-2' },
        update: {},
        create: {
          id: 'test-tenant-id-2',
          name: 'Test Tenant 2',
        },
      });
      // Crear usuario de prueba
      const SALT_ROUNDS = 10;
      const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
      const testUser = await prisma.user.upsert({
        where: { email: 'test2@example.com' },
        update: {},
        create: {
          email: 'test2@example.com',
          name: 'Test User 2',
          password: hashedPassword,
          tenantId: testTenant.id,
          role: 'admin',
        },
      });
      // Simular login para obtener token JWT
      const loginResponse = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'password123',
        });
      if (!loginResponse.body.access_token) {
        console.error('No se pudo obtener el token de autenticación', loginResponse.body);
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const authToken = loginResponse.body.access_token;
      // Crear proyecto de prueba
      const testProject = await prisma.project.upsert({
        where: { id: 'test-project-2' },
        update: {},
        create: {
          id: 'test-project-2',
          name: 'Test Project 2',
          description: 'Project 2 for E2E testing',
          ownerUserId: testUser.id,
          tenantId: testUser.tenantId,
        },
      });
      // 1. Crear prompt con referencia circular
      const prompt1Res = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: `test-prompt-1-${Date.now()}`,
          name: 'Test Prompt 1-3',
          description: 'Prompt 1-3 with circular reference',
          promptText: 'This is prompt 1-3 with {{prompt2-2}}',
          type: 'SYSTEM',
        });
      console.log('Respuesta al crear prompt1:', prompt1Res.status, prompt1Res.body, prompt1Res.text);
      expect(prompt1Res.status).toBe(201);
      const prompt1 = prompt1Res;

      const prompt2Res = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'test-prompt-2-2',
          name: 'Test Prompt 2-2',
          description: 'Prompt 2-2 with circular reference',
          promptText: 'This is prompt 2-2 with {{prompt1-3}}',
          type: 'SYSTEM',
        });
      console.log('Respuesta al crear prompt2:', prompt2Res.status, prompt2Res.body, prompt2Res.text);
      expect(prompt2Res.status).toBe(201);
      const prompt2 = prompt2Res;

      // 2. Crear versiones
      await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${prompt1.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionTag: '1.0.0',
          promptText: 'This is prompt 1-3 with {{prompt2-2}}',
        })
        .expect(201);

      await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${prompt2.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionTag: '1.0.0',
          promptText: 'This is prompt 2-2 with {{prompt1-3}}',
        })
        .expect(201);

      // 3. Probar resolución (debería detectar la referencia circular)
      const resolvedPrompt = await supertest(app.getHttpServer())
        .get(`/projects/${testProject.id}/prompts/${prompt1.body.id}/versions/1.0.0`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ processed: true })
        .expect(200);

      expect(resolvedPrompt.body.promptText).toContain('Circular reference detected');
    });
  });
}); 