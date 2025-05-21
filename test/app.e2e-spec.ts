import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Crear tenant primero
    const testTenant = await prisma.tenant.upsert({
      where: { id: 'test-tenant-id-4' },
      update: {},
      create: {
        id: 'test-tenant-id-4',
        name: 'Test Tenant 4',
      },
    });

    // Crear usuario de prueba
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    const testUser = await prisma.user.upsert({
      where: { email: 'test4@example.com' },
      update: {},
      create: {
        email: 'test4@example.com',
        name: 'Test User 4',
        password: hashedPassword, // hash de 'password123'
        tenantId: testTenant.id,
        role: 'user',
      },
    });

    // Obtener token de autenticación
    const loginResponse = await supertest(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test4@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  it('/user-check (GET) - sin autenticación', () => {
    return supertest(app.getHttpServer())
      .get('/user-check')
      .expect(401);
  });

  it('/user-check (GET) - con autenticación', () => {
    return supertest(app.getHttpServer())
      .get('/user-check')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
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
      console.log('Limpieza de base de datos completada en afterAll');
    } catch (err) {
      console.error('Error durante la limpieza en afterAll:', err);
    }
    await app.close();
    console.log('App cerrada en afterAll');
  });

  describe('AppController (e2e)', () => {
    it('/user-check (GET) - con autenticación', async () => {
      // Crear tenant
      const testTenant = await prisma.tenant.upsert({
        where: { id: 'test-tenant-id-4' },
        update: {},
        create: {
          id: 'test-tenant-id-4',
          name: 'Test Tenant 4',
        },
      });
      // Crear usuario
      const SALT_ROUNDS = 10;
      const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
      const testUser = await prisma.user.upsert({
        where: { email: 'test4@example.com' },
        update: {},
        create: {
          email: 'test4@example.com',
          name: 'Test User 4',
          password: hashedPassword,
          tenantId: testTenant.id,
          role: 'admin',
        },
      });
      // Obtener token
      const loginResponse = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test4@example.com',
          password: 'password123',
        });
      if (!loginResponse.body.access_token) {
        console.error('No se pudo obtener el token de autenticación', loginResponse.body);
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const authToken = loginResponse.body.access_token;
      console.log('Token obtenido:', authToken);
      // Crear proyecto
      const testProject = await prisma.project.upsert({
        where: { id: 'test-project-4' },
        update: {},
        create: {
          id: 'test-project-4',
          name: 'Test Project 4',
          description: 'Project 4 for E2E testing',
          ownerUserId: testUser.id,
          tenantId: testUser.tenantId,
        },
      });
      console.log('Proyecto creado:', testProject);
      // Probar endpoint /user-check
      const response = await supertest(app.getHttpServer())
        .get('/user-check')
        .set('Authorization', `Bearer ${authToken}`);
      if (response.status !== 200) {
        console.error('Error al verificar usuario:', response.status, response.body, response.text);
      }
      expect(response.status).toBe(200);
    });
  });
});
