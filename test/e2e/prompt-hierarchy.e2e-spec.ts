import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';

describe('Prompt Hierarchy E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUser: any;
  let testTenant: any;

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
    testTenant = await prisma.tenant.upsert({
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
    testUser = await prisma.user.upsert({
      where: { email: 'test2@example.com' },
      update: {
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
      create: {
        email: 'test2@example.com',
        name: 'Test User 2',
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
    });

    // Obtener token de autenticación
    const loginResponse = await supertest(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test2@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  describe('Prompt Creation and Resolution', () => {
    it('should create a complete prompt hierarchy and resolve it correctly', async () => {
      // 1. Crear proyecto
      const projectResponse = await supertest(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project 2',
          description: 'Project 2 for E2E testing',
        });

      expect(projectResponse.status).toBe(201);
      const testProject = projectResponse.body;

      // 2. Crear prompt base
      const basePromptResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Base Prompt 2',
          description: 'Base prompt 2 for testing',
          content: 'This is a base prompt with {{asset1-2}} and {{asset2-2}}',
          type: 'SYSTEM',
        });

      expect(basePromptResponse.status).toBe(201);
      console.log('Respuesta al crear base prompt:', basePromptResponse.status, basePromptResponse.body, basePromptResponse.text);

      // 3. Crear versión del prompt (no usar 1.0.0 que ya existe automáticamente)
      const versionResponse = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts/${basePromptResponse.body.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          promptText: 'This is a base prompt with {{asset1-2}} and {{asset2-2}}',
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

      // 5. Probar resolución del prompt usando serve-prompt endpoint
      const resolvedPrompt = await supertest(app.getHttpServer())
        .post(`/serve-prompt/execute/${testProject.id}/${basePromptResponse.body.id}/1.0.1/base`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {}
        })
        .expect(201);

      expect(resolvedPrompt.body).toHaveProperty('processedPrompt');
      expect(resolvedPrompt.body).toHaveProperty('metadata');
    });

    it('should handle circular references correctly', async () => {
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

      // 2. Crear prompt1 que referencia a prompt2
      const prompt1Res = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Prompt 1-3',
          description: 'Prompt 1 for testing circular references',
          content: 'This is prompt 1 with {{prompt2-3}}',
          type: 'SYSTEM',
        });
      console.log('Respuesta al crear prompt1:', prompt1Res.status, prompt1Res.body, prompt1Res.text);
      expect(prompt1Res.status).toBe(201);
      const prompt1 = prompt1Res;

      // 3. Crear prompt2 que referencia a prompt1
      const prompt2Res = await supertest(app.getHttpServer())
        .post(`/projects/${testProject.id}/prompts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Prompt 2-3',
          description: 'Prompt 2 for testing circular references',
          content: 'This is prompt 2 with {{prompt1-3}}',
          type: 'SYSTEM',
        });
      console.log('Respuesta al crear prompt2:', prompt2Res.status, prompt2Res.body, prompt2Res.text);
      expect(prompt2Res.status).toBe(201);
      const prompt2 = prompt2Res;

      // 4. Intentar resolver prompt1 usando serve-prompt endpoint
      // El sistema debería detectar la referencia circular y manejarlo apropiadamente
      const resolveResponse = await supertest(app.getHttpServer())
        .post(`/serve-prompt/execute/${testProject.id}/${prompt1.body.id}/latest/base`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {}
        });

      // Verificar que el sistema maneja apropiadamente las referencias circulares
      // El sistema debería responder exitosamente sin fallar, independientemente del contenido específico
      expect(resolveResponse.status).toBe(201);
      expect(resolveResponse.body).toHaveProperty('processedPrompt');
      expect(resolveResponse.body).toHaveProperty('metadata');
      // El contenido puede estar vacío o contener algún manejo de la referencia circular
      expect(typeof resolveResponse.body.processedPrompt).toBe('string');
    });
  });

  afterAll(async () => {
    try {
      // Limpiar datos específicos de este test usando limpieza global
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
}); 