import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  adapter: {
    url: process.env.DATABASE_URL!,
  },
  log: process.env.NODE_ENV === "development" ? ["query", "info"] : ["error"],
});
