import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton.
 *
 * Two things the original three-line version got wrong for this deployment:
 *
 * 1. The global was only assigned outside production. On Vercel every route
 *    handler is its own module graph entry; a warm lambda that re-evaluates
 *    this file constructed a SECOND PrismaClient and opened a second pool
 *    against Neon. Assigning the global unconditionally makes the instance
 *    genuinely process-wide, which is what "singleton" was meant to buy.
 *
 * 2. No log configuration, so a slow query in production was invisible.
 *    Errors and warnings now surface on every environment.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  return new PrismaClient({
    log: ["error", "warn"],
    errorFormat: process.env.NODE_ENV === "production" ? "minimal" : "pretty",
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;
