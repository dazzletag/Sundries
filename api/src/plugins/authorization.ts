import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";

const resolveUpn = (request: FastifyRequest) =>
  request.auth?.upn ?? request.auth?.preferred_username ?? undefined;

const requireOid = (request: FastifyRequest, fastify: FastifyInstance) => {
  const oid = request.auth?.oid;
  if (!oid) {
    throw fastify.httpErrors.unauthorized("Missing user object id");
  }
  return oid;
};

const authorizationPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate("ensureUser", async (request: FastifyRequest) => {
    const oid = requireOid(request, fastify);
    const upn = resolveUpn(request);
    return fastify.prisma.appUser.upsert({
      where: { oid },
      create: {
        oid,
        upn: upn ?? null,
        displayName: upn ?? null
      },
      update: {
        upn: upn ?? undefined
      }
    });
  });

  fastify.decorate("getUserContext", async (request: FastifyRequest) => {
    const user = await fastify.ensureUser(request);
    const roles = await fastify.prisma.userHomeRole.findMany({
      where: { userId: user.id },
      include: { careHome: true }
    });
    const isAdmin = roles.some((role) => role.role === "Admin");
    return {
      user,
      roles,
      isAdmin,
      careHomeIds: roles.map((role) => role.careHomeId),
      careHomeNames: roles.map((role) => role.careHome.name)
    };
  });

  fastify.decorate("requireAdmin", async (request: FastifyRequest) => {
    const { isAdmin } = await fastify.getUserContext(request);
    if (!isAdmin) {
      throw fastify.httpErrors.forbidden("Admin access required");
    }
  });

  fastify.decorate(
    "requireHomeAccess",
    async (request: FastifyRequest, careHomeId: string) => {
      const { isAdmin, roles } = await fastify.getUserContext(request);
      if (isAdmin) return;
      const match = roles.find((role) => role.careHomeId === careHomeId);
      if (!match) {
        throw fastify.httpErrors.forbidden("No access to this care home");
      }
    }
  );
});

export default authorizationPlugin;
