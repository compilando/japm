import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Asegurarse de que la base de datos esté limpia antes de los tests
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Aumentar el timeout para los tests e2e
jest.setTimeout(30000); 