const connectionString = process.argv[2] ?? process.env.DATABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Database connection string is required.");
  process.exit(1);
}

const parseKeyValuePairs = (input) =>
  input
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [key, ...rest] = entry.split("=");
      return [key.trim().toLowerCase(), rest.join("=").trim()];
    });

const entries = parseKeyValuePairs(connectionString);
const map = Object.fromEntries(entries);

const server = map.server ?? map["data source"] ?? map.address;
const user = map["user id"] ?? map.uid;
const password = map.password ?? map.pwd;
const database = map["initial catalog"] ?? map.database;

if (!server || !user || !password || !database) {
  console.error("Database connection string must include server, user ID, password, and database.");
  process.exit(1);
}

let host = server.replace(/^tcp:/i, "").trim();
let port = "1433";
if (host.includes(",")) {
  const [maybeHost, maybePort] = host.split(",");
  host = maybeHost.trim();
  port = maybePort.trim() || port;
} else if (map.port) {
  port = map.port.trim() || port;
}

const normalizeBoolean = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized === "true") {
    return "true";
  }
  if (normalized === "false") {
    return "false";
  }
  return value;
};

const queryParams = [];
const encryptValue = normalizeBoolean(map.encrypt);
const trustValue = normalizeBoolean(map["trustservercertificate"] ?? map["trust server certificate"]);
if (encryptValue) {
  queryParams.push(`encrypt=${encryptValue}`);
}
if (trustValue) {
  queryParams.push(`trustServerCertificate=${trustValue}`);
}

const queryString = queryParams.length ? `?${queryParams.join("&")}` : "";
const url = `sqlserver://${encodeURIComponent(user)}:${encodeURIComponent(
  password
)}@${host}:${port}/${encodeURIComponent(database)}${queryString}`;

console.log(url);
