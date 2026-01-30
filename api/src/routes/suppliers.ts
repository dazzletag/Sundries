import { FastifyInstance } from "fastify";
export default async function supplierRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  });

  fastify.post("/", { preHandler: fastify.authenticate }, async (request) => {
    void request;
    throw fastify.httpErrors.notImplemented("Suppliers are sourced from Sage and synced into Vendors.");
  });
}
