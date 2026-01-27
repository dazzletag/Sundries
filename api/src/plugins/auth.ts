import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { URL } from "node:url";
const { JWT, JWK } = require("jose");

type JWTPayload = Record<string, unknown> & {
  roles?: unknown;
  groups?: unknown;
  upn?: unknown;
  preferred_username?: unknown;
  tid?: unknown;
  oid?: unknown;
  sub?: unknown;
};

type AuthorizationHeader = string | string[] | undefined;

const tenantId = process.env.TENANT_ID ?? "";
const audience = process.env.API_AUDIENCE ?? "";

if (!tenantId || !audience) {
  throw new Error("TENANT_ID and API_AUDIENCE must be set");
}

const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const jwksUrl = new URL(`${issuer}/discovery/v2.0/keys`);

const extractRoles = (payload: JWTPayload): string[] => {
  const raw = payload.roles ?? payload.groups ?? [];
  return Array.isArray(raw) ? raw.map((role) => String(role)) : [String(raw)];
};

const normalizeHeader = (value: AuthorizationHeader) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

type FetchFunction = (input: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
const globalFetch = (globalThis as typeof globalThis & { fetch?: FetchFunction }).fetch;
const fetcher: FetchFunction =
  typeof globalFetch === "function"
    ? globalFetch.bind(globalThis)
    : (_url: string) => Promise.reject(new Error("`fetch` is not available in this environment"));

const JWKS_CACHE_TTL = 5 * 60 * 1000;
let cachedJWKS: { keys: unknown[] } | null = null;
let cacheExpiresAt = 0;

const getJWKS = async () => {
  if (cachedJWKS && Date.now() < cacheExpiresAt) {
    return cachedJWKS;
  }

  const response = await fetcher(jwksUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to load JWKS (${response.status})`);
  }

  cachedJWKS = (await response.json()) as { keys: unknown[] };
  cacheExpiresAt = Date.now() + JWKS_CACHE_TTL;
  return cachedJWKS;
};

const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = normalizeHeader(
      request.headers["authorization"] ?? request.headers["Authorization"]
    );
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw fastify.httpErrors.unauthorized("Missing Bearer token");
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    const decoded = JWT.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    if (!kid) {
      throw fastify.httpErrors.unauthorized("Invalid token header");
    }

    const jwks = await getJWKS();
    const jwk = (jwks.keys as Record<string, unknown>[]).find((key) => key.kid === kid);
    if (!jwk) {
      throw fastify.httpErrors.unauthorized("Unknown JWK kid");
    }

    const { payload } = JWT.verify(token, JWK.asKey(jwk), {
      issuer,
      audience
    });

    const roles = extractRoles(payload);
    const upn = typeof payload.upn === "string" ? payload.upn : undefined;
    const preferredUsername = typeof payload.preferred_username === "string" ? payload.preferred_username : undefined;

    request.auth = {
      sub: typeof payload.sub === "string" ? payload.sub : "",
      upn,
      roles,
      tid: typeof payload.tid === "string" ? payload.tid : undefined,
      oid: typeof payload.oid === "string" ? payload.oid : undefined,
      preferred_username: preferredUsername
    };
  });
});

export default authPlugin;
