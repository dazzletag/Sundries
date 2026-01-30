import { FastifyInstance } from "fastify";
import careHomeRoutes from "./carehomes";
import supplierRoutes from "./suppliers";
import residentRoutes from "./residents";
import careHqRoutes from "./carehq";
import consentRoutes from "./consents";
import visitRoutes from "./visits";
import providerRoutes from "./providers";
import invoiceRoutes from "./invoices";
import adminRoutes from "./admin";
import residentConsentRoutes from "./residentConsents";
import vendorRoutes from "./vendors";
import priceItemRoutes from "./priceItems";
import salesRoutes from "./sales";
import newspaperRoutes from "./newspapers";

export default async function registerRoutes(fastify: FastifyInstance) {
  const healthResponse = () => ({
    status: "ok",
    timestamp: new Date().toISOString()
  });

  fastify.get("/", async () => healthResponse());
  fastify.get<{ Params: { robotsFile: string } }>("/:robotsFile.txt", async (request, reply) => {
    if (!/^robots\d+$/.test(request.params.robotsFile)) {
      reply.callNotFound();
      return;
    }
    return {
      status: "ok",
      timestamp: new Date().toISOString()
    };
  });

  fastify.get("/health", async () => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch (error) {
      fastify.log.error(error);
      return { status: "ok", timestamp: new Date().toISOString() };
    }
  });

  fastify.get("/me", { preHandler: fastify.authenticate }, async (request) => {
    const context = await fastify.getUserContext(request);
    return {
      auth: request.auth,
      user: context.user,
      roles: context.roles,
      isAdmin: context.isAdmin
    };
  });

  fastify.register(careHomeRoutes, { prefix: "/carehomes" });
  fastify.register(supplierRoutes, { prefix: "/suppliers" });
  fastify.register(residentRoutes, { prefix: "/residents" });
  fastify.register(careHqRoutes, { prefix: "/carehq" });
  fastify.register(consentRoutes);
  fastify.register(visitRoutes);
  fastify.register(providerRoutes);
  fastify.register(invoiceRoutes);
  fastify.register(adminRoutes, { prefix: "/admin" });
  fastify.register(residentConsentRoutes);
  fastify.register(vendorRoutes);
  fastify.register(priceItemRoutes);
  fastify.register(salesRoutes);
  fastify.register(newspaperRoutes);
}
