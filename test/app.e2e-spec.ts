import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/any-authenticated-check (GET)', () => {
    return supertest(app.getHttpServer())
      .get('/api/any-authenticated-check')
      .expect(401); // Esperamos 401 porque no estamos autenticados
  });

  afterEach(async () => {
    await app.close();
  });
});
