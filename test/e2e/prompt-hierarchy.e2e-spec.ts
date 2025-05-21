import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@prisma/client';

describe('Prompt Hierarchy E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: { id: string; tenantId: string };
  let testProject: { id: string };
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Crear usuario de prueba
    testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
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
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    // Eliminar logs de ejecución relacionados
    await prisma.promptExecutionLog.deleteMany({ where: { projectId: testProject.id } });
    // Eliminar versiones de assets de prompts
    const assetIds = (await prisma.promptAsset.findMany({ where: { projectId: testProject.id }, select: { id: true } })).map(a => a.id);
    await prisma.promptAssetVersion.deleteMany({ where: { assetId: { in: assetIds } } });
    // Eliminar assets de prompts
    await prisma.promptAsset.deleteMany({ where: { prompt: { projectId: testProject.id } } });
    // Eliminar traducciones de versiones
    const versionIds = (await prisma.promptVersion.findMany({ where: { prompt: { projectId: testProject.id } }, select: { id: true } })).map(v => v.id);
    await prisma.promptTranslation.deleteMany({ where: { versionId: { in: versionIds } } });
    // Eliminar versiones de prompts
    await prisma.promptVersion.deleteMany({ where: { prompt: { projectId: testProject.id } } });
    // Eliminar prompts
    await prisma.prompt.deleteMany({ where: { projectId: testProject.id } });
    // Eliminar proyecto
    await prisma.project.delete({ where: { id: testProject.id } });
    // Eliminar usuario
    await prisma.user.delete({ where: { id: testUser.id } });
    await app.close();
  });

  describe('Prompt Creation and Resolution', () => {
    it('should create a complete prompt hierarchy and resolve it correctly', async () => {
      // 1. Crear prompt base
      const basePrompt = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'test-base-prompt',
          name: 'Test Base Prompt',
          description: 'Base prompt for testing',
          content: 'This is a base prompt with {{asset1}} and {{asset2}}',
          type: 'SYSTEM',
        })
        .then(res => {
          if (res.status !== 201) {
            // Log completo de la respuesta si falla
            console.error('Error al crear base prompt:', res.status, res.body, res.text);
          }
          expect(res.status).toBe(201);
          return res;
        });

      // 2. Crear assets
      const asset1 = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${basePrompt.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'asset1',
          value: 'This is asset 1',
          promptId: basePrompt.body.id,
          projectId: testProject.id,
        })
        .expect(201);

      const asset2 = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${basePrompt.body.id}/assets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'asset2',
          value: 'This is asset 2',
          promptId: basePrompt.body.id,
          projectId: testProject.id,
        })
        .expect(201);

      // 3. Crear versión del prompt
      const promptVersion = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${basePrompt.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionTag: '1.0.0',
          promptText: 'This is a base prompt with {{asset1}} and {{asset2}}',
        })
        .expect(201);

      // 4. Crear traducción
      const translation = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${basePrompt.body.id}/versions/${promptVersion.body.id}/translations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          languageCode: 'es-ES',
          promptText: 'Este es un prompt base con {{asset1}} y {{asset2}}',
        })
        .expect(201);

      // 5. Probar resolución del prompt
      const resolvedPrompt = await supertest(app.getHttpServer())
        .post(`/api/serve-prompt/execute/${testProject.id}/test-base-prompt/1.0.0/base`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(resolvedPrompt.body.promptText).toBe(
        'This is a base prompt with This is asset 1 and This is asset 2',
      );

      // 6. Probar resolución del prompt en español
      const resolvedPromptEs = await supertest(app.getHttpServer())
        .post(`/api/serve-prompt/execute/${testProject.id}/test-base-prompt/1.0.0/lang/es-ES`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(resolvedPromptEs.body.promptText).toBe(
        'Este es un prompt base con This is asset 1 y This is asset 2',
      );
    });

    it('should handle circular references correctly', async () => {
      // 1. Crear prompt con referencia circular
      const prompt1 = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'test-prompt-1',
          name: 'Test Prompt 1',
          description: 'Prompt with circular reference',
          content: 'This is prompt 1 with {{prompt2}}',
          type: 'SYSTEM',
        })
        .expect(201);

      const prompt2 = await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'test-prompt-2',
          name: 'Test Prompt 2',
          description: 'Prompt with circular reference',
          content: 'This is prompt 2 with {{prompt1}}',
          type: 'SYSTEM',
        })
        .expect(201);

      // 2. Crear versiones
      await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${prompt1.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionTag: '1.0.0',
          promptText: 'This is prompt 1 with {{prompt2}}',
        })
        .expect(201);

      await supertest(app.getHttpServer())
        .post(`/api/projects/${testProject.id}/prompts/${prompt2.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionTag: '1.0.0',
          promptText: 'This is prompt 2 with {{prompt1}}',
        })
        .expect(201);

      // 3. Probar resolución (debería detectar la referencia circular)
      const resolvedPrompt = await supertest(app.getHttpServer())
        .get(`/api/projects/${testProject.id}/prompts/${prompt1.body.id}/versions/1.0.0`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ processed: true })
        .expect(200);

      expect(resolvedPrompt.body.promptText).toContain('Circular reference detected');
    });
  });
}); 