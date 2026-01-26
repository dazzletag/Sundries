import { defineConfig } from "@prisma/config";

const dbUrl = process.env.DATABASE_URL;
const requireDatabaseUrl = process.env.PRISMA_REQUIRE_DATABASE_URL === "true";

if (!dbUrl && requireDatabaseUrl) {
  throw new Error("Set DATABASE_URL before running Prisma commands.");
}

const connectionUrl = dbUrl ?? "sqlserver://localhost:1433/sundries?trustServerCertificate=true";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    provider: "sqlserver",
    url: connectionUrl
  }
});

