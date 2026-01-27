import { FastifyInstance } from "fastify";
import careHomeRoutes from "./carehomes";
import supplierRoutes from "./suppliers";
import residentRoutes from "./residents";
import consentRoutes from "./consents";
import visitRoutes from "./visits";
import providerRoutes from "./providers";
import invoiceRoutes from "./invoices";

export default async function registerRoutes(fastify: FastifyInstance) {
  fastify.get(/^\/robots\d+\.txt$/, async () => ({
    status: "ok",
    timestamp: new Date().toISOString()
  }));

  fastify.get("/health", async () => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch (error) {
      fastify.log.error(error);
      return { status: "ok", timestamp: new Date().toISOString() };
    }
  });

  fastify.get("/me", { preHandler: fastify.authenticate }, async (request) => ({
    user: request.auth
  }));

  fastify.register(careHomeRoutes, { prefix: "/carehomes" });
  fastify.register(supplierRoutes, { prefix: "/suppliers" });
  fastify.register(residentRoutes, { prefix: "/residents" });
  fastify.register(consentRoutes);
  fastify.register(visitRoutes);
  fastify.register(providerRoutes);
  fastify.register(invoiceRoutes);
}
