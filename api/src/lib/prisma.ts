import { Prisma, PrismaClient } from "@prisma/client";

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

const resolvedHost = (() => {
  const match = databaseUrl.match(/^sqlserver:\/\/([^;]+)/i);
  return match?.[1] ?? "unknown";
})();

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info"] : ["error"]
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientConnectivityError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001: Can't reach database server, P1002: server terminated connection, P1017: Server closed connection
    return ["P1001", "P1002", "P1008", "P1017"].includes(error.code);
  }
  return false;
};

const REQUEST_RETRY_ATTEMPTS = 2;
const REQUEST_RETRY_BACKOFF_MS = 500;

export const prisma = basePrisma.$extends({
  name: "retry-transient-connectivity",
  query: {
    $allOperations: async ({ args, query }) => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= REQUEST_RETRY_ATTEMPTS; attempt += 1) {
        try {
          return await query(args);
        } catch (error) {
          lastError = error;
          if (!isTransientConnectivityError(error) || attempt === REQUEST_RETRY_ATTEMPTS) {
            throw error;
          }
          await sleep(REQUEST_RETRY_BACKOFF_MS * (attempt + 1));
        }
      }
      throw lastError;
    }
  }
});

const BOOT_CONNECT_ATTEMPTS = 5;
const BOOT_CONNECT_BASE_DELAY_MS = 1000;

export const ensurePrismaConnected = async (logger: {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}): Promise<void> => {
  for (let attempt = 1; attempt <= BOOT_CONNECT_ATTEMPTS; attempt += 1) {
    const started = Date.now();
    try {
      await basePrisma.$connect();
      await basePrisma.$queryRawUnsafe("SELECT 1 AS ok");
      logger.info(
        { attempt, host: resolvedHost, elapsedMs: Date.now() - started },
        "Prisma connected"
      );
      return;
    } catch (error) {
      const elapsedMs = Date.now() - started;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        { attempt, host: resolvedHost, elapsedMs, err: message },
        "Prisma connect failed"
      );
      if (attempt === BOOT_CONNECT_ATTEMPTS) {
        throw error;
      }
      await sleep(BOOT_CONNECT_BASE_DELAY_MS * attempt);
    }
  }
};
