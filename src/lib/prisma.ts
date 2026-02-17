import { PrismaClient } from '@prisma/client';

type GlobalPrisma = {
  prisma: PrismaClient | undefined;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function createPrismaClient() {
  const client = new PrismaClient();

  if (process.env.NODE_ENV === 'production') {
    client.$connect().catch((error) => {
      // Минимальное логирование
    });
  }

  return client;
}

const prismaClient =
  process.env.NODE_ENV === 'production'
    ? globalForPrisma.prisma ?? createPrismaClient()
    : globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV === 'production' && !globalForPrisma.prisma) {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;


