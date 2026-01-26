import { FastifyInstance } from "fastify";
import { z } from "zod";

const residentSchema = z.object({
  careHomeId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().optional(),
  isActive: z.boolean().default(true)
});

export default async function residentRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.resident.findMany({
      where: { isActive: true },
      include: { careHome: true },
      orderBy: { lastName: "asc" }
    });
  });

  fastify.post("/", { preHandler: fastify.authenticate }, async (request) => {
    const payload = residentSchema.parse(request.body);
    const parsed = {
      ...payload,
      dob: payload.dob ? new Date(payload.dob) : undefined
    };
    return fastify.prisma.resident.create({ data: parsed });
  });
}
