import { defineConfig } from "@prisma/config";

const normalizeSqlServerConnection = (connectionString: string): string => {
  if (!connectionString) {
    throw new Error("Database connection string is empty.");
  }

  if (/^sqlserver:\/\//i.test(connectionString)) {
    return connectionString;
  }

  const entries = connectionString
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split("=").map((part) => part.trim()));

  const map = entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});

  const server = map["server"] ?? map["data source"] ?? map["address"];
  if (!server) {
    throw new Error("Server host not found in connection string.");
  }

  const user = map["user id"] ?? map["uid"];
  const password = map["password"] ?? map["pwd"];
  const catalog = map["initial catalog"] ?? map["database"];

  if (!user || !password || !catalog) {
    throw new Error("User, password, and database must be supplied in the connection string.");
  }

  let host = server.replace(/^tcp:/i, "");
  let port = "1433";
  if (host.includes(",")) {
    const parts = host.split(",");
    host = parts[0];
    port = parts[1] || port;
  }

  const queryParams: string[] = [];
  const encrypt = map["encrypt"];
  const trustServerCertificate = map["trustservercertificate"] ?? map["trust server certificate"];
  if (encrypt) {
    queryParams.push(`encrypt=${encodeURIComponent(encrypt)}`);
  }
  if (trustServerCertificate) {
    queryParams.push(`trustServerCertificate=${encodeURIComponent(trustServerCertificate)}`);
  }

  const query = queryParams.length ? `?${queryParams.join("&")}` : "";
  return `sqlserver://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(
    catalog
  )}${query}`;
};

const databaseUrl = process.env.DATABASE_URL;
const requireDatabaseUrl = process.env.PRISMA_REQUIRE_DATABASE_URL === "true";

if (!databaseUrl && requireDatabaseUrl) {
  throw new Error("Set DATABASE_URL before running Prisma commands.");
}

const fallbackConnection =
  "sqlserver://localhost:1433/sundries?trustServerCertificate=true";

const connectionUrl = normalizeSqlServerConnection(databaseUrl ?? fallbackConnection);

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    provider: "sqlserver",
    url: connectionUrl
  }
});

