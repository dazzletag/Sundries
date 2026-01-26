import { defineConfig } from "@prisma/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL before running Prisma commands.");
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasources: {
    db: {
      provider: "sqlserver",
      url: databaseUrl
    }
  }
});

