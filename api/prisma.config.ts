import { defineConfig } from "@prisma/config";

const databaseUrl = process.env.DATABASE_URL;
const requireDatabaseUrl = process.env.PRISMA_REQUIRE_DATABASE_URL === "true";

if (!databaseUrl && requireDatabaseUrl) {
  throw new Error("Set DATABASE_URL before running Prisma commands.");
}

const connectionUrl =
  databaseUrl ?? "sqlserver://localhost;database=sundries;trustServerCertificate=true;";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasources: {
    db: {
      provider: "sqlserver",
      url: connectionUrl
    }
  }
});

