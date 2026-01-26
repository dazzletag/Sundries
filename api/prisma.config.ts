import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasources: {
    db: {
      provider: "sqlserver",
      url: process.env.DATABASE_URL
    }
  }
});

