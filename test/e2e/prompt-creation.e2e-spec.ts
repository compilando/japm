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

    // Crear el tenant por defecto
    const testTenant = await prisma.tenant.create({
      data: {
        name: 'Default Tenant',
      },
    });

    // Crear el usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.upsert({
      where: { email: 'test1@example.com' },
      update: {
        name: 'Test User',
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
      create: {
        name: 'Test User',
        email: 'test1@example.com',
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'admin',
      },
    });

    // Obtener token de autenticación
    const loginResponse = await supertest(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test1@example.com',
        password: 'password123',
      });

    if (!loginResponse.body.access_token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

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
    await app.close();
  });

  describe('Prompt Asset Creation', () => {
    it('should create a prompt asset with initial version', async () => {
      try {
        // 1. Crear prompt base
        const response = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'test-prompt-1',
            type: 'SYSTEM',
            promptText: 'This is a test prompt with {{saludo1}}',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');

        // 2. Crear asset con versión inicial
        const assetResponse = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts/${response.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: 'saludo1',
            name: 'Saludo Formal 1',
            category: 'Saludos 1',
            initialValue: 'Buenos días',
            initialChangeMessage: 'Versión inicial del saludo',
            tenantId: testUser.tenantId,
          });

        expect(assetResponse.status).toBe(201);
        expect(assetResponse.body).toHaveProperty('id');
        expect(assetResponse.body.key).toBe('saludo1');
        expect(assetResponse.body.versions).toHaveLength(1);
        expect(assetResponse.body.versions[0].value).toBe('Buenos días');
        expect(assetResponse.body.versions[0].changeMessage).toBe('Versión inicial del saludo');
      } catch (error) {
        console.error('Error en el test:', error);
        throw error;
      }
    });

    it('should fail when creating an asset with duplicate key', async () => {
      try {
        // 1. Crear prompt base
        const response = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'test-prompt-2',
            type: 'SYSTEM',
            promptText: 'This is a test prompt with {{saludo1}}',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');

        // 2. Crear primer asset
        const asset1 = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts/${response.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: 'saludo1',
            name: 'Saludo Formal 1',
            category: 'Saludos 1',
            initialValue: 'Buenos días',
            initialChangeMessage: 'Versión inicial del saludo',
            tenantId: testUser.tenantId,
          });

        expect(asset1.status).toBe(201);

        // 3. Intentar crear segundo asset con la misma key
        const asset2 = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts/${response.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: 'saludo1',
            name: 'Saludo Formal 2',
            category: 'Saludos 2',
            initialValue: 'Buenas tardes',
            initialChangeMessage: 'Versión inicial del saludo 2',
            tenantId: testUser.tenantId,
          });

        expect(asset2.status).toBe(409);
      } catch (error) {
        console.error('Error en el test:', error);
        throw error;
      }
    });

    it('should fail when creating an asset with invalid data', async () => {
      try {
        // 1. Crear prompt base
        const response = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'test-prompt-3',
            type: 'SYSTEM',
            promptText: 'This is a test prompt with {{saludo1}}',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');

        // 2. Intentar crear asset con datos inválidos
        const invalidResponse = await supertest(app.getHttpServer())
          .post(`/projects/${testProject.id}/prompts/${response.body.id}/assets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: '', // key vacía
            name: '', // nombre vacío
            initialValue: '', // valor inicial vacío
            tenantId: testUser.tenantId,
          });

        expect(invalidResponse.status).toBe(400);
        expect(Array.isArray(invalidResponse.body.message)).toBe(true);
        expect(invalidResponse.body.message).toContain('key should not be empty');
        expect(invalidResponse.body.message).toContain('name should not be empty');
        expect(invalidResponse.body.message).toContain('initialValue should not be empty');
      } catch (error) {
        console.error('Error en el test:', error);
        throw error;
      }
    });
  });
}); 