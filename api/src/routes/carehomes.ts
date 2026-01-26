import { FastifyInstance } from "fastify";
import { z } from "zod";

const careHomeSchema = z.object({
  name: z.string().min(3),
  region: z.string().default("UK South")
});

export default async function careHomeRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.careHome.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
  });

  fastify.post("/", { preHandler: fastify.authenticate }, async (request) => {
    const payload = careHomeSchema.parse(request.body);
    return fastify.prisma.careHome.create({ data: payload });
  });
}
