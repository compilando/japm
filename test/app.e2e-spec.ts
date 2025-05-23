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

  // Crear usuario y token antes de cada test para asegurar que exista
  beforeEach(async () => {
    // Crear tenant primero
    testTenant = await prisma.tenant.upsert({
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
    testUser = await prisma.user.upsert({
      where: { email: 'test4@example.com' },
      update: {
        password: hashedPassword,
        tenantId: testTenant.id,
        role: 'user',
      },
      create: {
        email: 'test4@example.com',
        name: 'Test User 4',
        password: hashedPassword,
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

  describe('Endpoint /user-check', () => {
    it('debería retornar 401 sin autenticación', () => {
      return supertest(app.getHttpServer())
        .get('/user-check')
        .expect(401);
    });

    it('debería retornar 200 con autenticación válida', () => {
      return supertest(app.getHttpServer())
        .get('/user-check')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('¡Acceso de usuario concedido!');
        });
    });

    it('debería retornar 403 con rol incorrecto', async () => {
      // Actualizar usuario a rol admin
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: 'admin' },
      });

      // Obtener nuevo token con el rol actualizado
      const loginResponse = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test4@example.com',
          password: 'password123',
        });

      const adminToken = loginResponse.body.access_token;

      // Intentar acceder con rol admin (debería fallar para endpoint user-check)
      await supertest(app.getHttpServer())
        .get('/user-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      // Restaurar rol original para otros tests
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: 'user' },
      });
    });
  });

  afterAll(async () => {
    try {
      // Limpiar datos específicos de este test
      await prisma.user.deleteMany({
        where: { email: 'test4@example.com' }
      });
      await prisma.tenant.deleteMany({
        where: { id: 'test-tenant-id-4' }
      });
      console.log('Limpieza de datos específicos completada en afterAll');
    } catch (err) {
      console.error('Error durante la limpieza en afterAll:', err);
    }
    await app.close();
    console.log('App cerrada en afterAll');
  });
});
