const connectionString =
  process.argv[2] ?? process.env.DATABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Database connection string is required.");
  process.exit(1);
}

const parseKeyValuePairs = (input) =>
  input
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((entry) => {
      const [key, ...rest] = entry.split("=");
      return [key.trim().toLowerCase(), rest.join("=").trim()];
    });

const map = Object.fromEntries(parseKeyValuePairs(connectionString));

const server = map.server ?? map["data source"] ?? map.address;
const user = map["user id"] ?? map.uid;
const password = map.password ?? map.pwd;
const database = map["initial catalog"] ?? map.database;

if (!server || !user || !password || !database) {
  console.error(
    "Connection string must include server, user ID, password, and database."
  );
  process.exit(1);
}

let host = server.replace(/^tcp:/i, "").trim();
let port = "1433";

if (host.includes(",")) {
  const [h, p] = host.split(",");
  host = h.trim();
  port = p?.trim() || port;
}

// Encode ONLY the password
const encodedPassword = encodeURIComponent(password);

// Minimal, Prisma-safe URL
const url =
  `sqlserver://${user}:${encodedPassword}` +
  `@${host}:${port}/${database}` +
  `?encrypt=true`;

console.log(url);
