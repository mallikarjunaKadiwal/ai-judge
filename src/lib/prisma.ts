import { PrismaClient } from '@prisma/client';

// This declares a global variable for Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// This creates a single instance of PrismaClient.
// If we're in development, it checks if an instance already exists
// on the global object to prevent creating new connections on every
// hot-reload.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;