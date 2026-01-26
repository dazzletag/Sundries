const connectionString =
  process.argv[2] ?? process.env.DATABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Database connection string is required.");
  process.exit(1);
}

const entries = connectionString
  .split(";")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [key, ...rest] = entry.split("=");
    return [key.trim().toLowerCase(), rest.join("=").trim()];
  });

const config = Object.fromEntries(entries);

const server = config.server ?? config["data source"] ?? config.address;
const user = config["user id"] ?? config.uid;
const password = config.password ?? config.pwd;
const database = config["initial catalog"] ?? config.database;

if (!server || !user || !password || !database) {
  console.error("Connection string must include server, user ID, password, and database.");
  process.exit(1);
}

let host = server.replace(/^tcp:/i, "").trim();
let port = "1433";
if (host.includes(",")) {
  const [maybeHost, maybePort] = host.split(",");
  host = maybeHost.trim();
  port = maybePort.trim() || port;
}

const normalizeBoolean = (value) => {
  if (!value) {
    return null;
  }
  const text = value.toLowerCase();
  if (text === "true") {
    return "True";
  }
  if (text === "false") {
    return "False";
  }
  return value;
};

const queryParams = [];
const encrypt = normalizeBoolean(config.encrypt);
const trustServerCertificate = normalizeBoolean(
  config["trustservercertificate"] ?? config["trust server certificate"]
);

if (encrypt) {
  queryParams.push(`encrypt=${encrypt}`);
}

if (trustServerCertificate) {
  queryParams.push(`trustServerCertificate=${trustServerCertificate}`);
}

const queryString = queryParams.length ? `?${queryParams.join("&")}` : "";
const url = `sqlserver://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(
  database
)}${queryString}`;

process.stdout.write(url);
