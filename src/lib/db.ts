import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const rawConnectionString = process.env.DATABASE_URL;

  if (!rawConnectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const connectionString = rawConnectionString.replace(
    /([?&])sslmode=(prefer|require|verify-ca)(?=&|$)/i,
    "$1sslmode=verify-full",
  );

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
