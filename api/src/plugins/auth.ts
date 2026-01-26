import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { URL } from "url";
import type { JWTPayload } from "jose";

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

const authPlugin = fp(async (fastify: FastifyInstance) => {
  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  const jwks = createRemoteJWKSet(jwksUrl);
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const jwks = createRemoteJWKSet(jwksUrl);
    const authorization = normalizeHeader(request.headers["authorization"] ?? request.headers["Authorization"]);
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw fastify.httpErrors.unauthorized("Missing Bearer token");
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    const { payload } = await jwtVerify(token, jwks, {
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

