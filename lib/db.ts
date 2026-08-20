import { PrismaClient } from "@prisma/client";
import { assertEnv } from "@/lib/env";

// Every server path that matters reaches the database, so this is the one
// import that reliably runs before the app can do anything with a bad config.
assertEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
