import { PrismaClient } from "@prisma/client";

const normalizeDatabaseUrl = (value: string) => {
  if (value.startsWith("sqlserver://")) {
    return value;
  }

  const entries = value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [key, ...rest] = entry.split("=");
      return [key.trim().toLowerCase(), rest.join("=").trim()];
    });

  const config = Object.fromEntries(entries) as Record<string, string>;
  const server = config.server ?? config["data source"] ?? config.address;
  const user = config["user id"] ?? config.uid;
  const password = config.password ?? config.pwd;
  const database = config["initial catalog"] ?? config.database;

  if (!server || !user || !password || !database) {
    throw new Error("DATABASE_URL must include server, user ID, password, and database.");
  }

  let host = server.replace(/^tcp:/i, "").trim();
  if (host.includes(",")) {
    const [maybeHost, maybePort] = host.split(",");
    const port = maybePort?.trim() || "1433";
    host = `${maybeHost.trim()}:${port}`;
  } else if (!host.includes(":")) {
    host = `${host}:1433`;
  }

  host = host.replace(/\.\.+/g, ".");

  return `sqlserver://${host};database=${database};user=${user};password=${encodeURIComponent(password)};encrypt=true`;
};

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL before booting the server.");
}

if (!databaseUrl.startsWith("sqlserver://")) {
  databaseUrl = normalizeDatabaseUrl(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info"] : ["error"]
});
