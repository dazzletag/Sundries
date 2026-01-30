import { FastifyInstance } from "fastify";
import { z } from "zod";

const vendorSchema = z.object({
  name: z.string().min(1),
  accountRef: z.string().min(1),
  defNomCode: z.string().optional().nullable(),
  tradeContact: z.string().optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  address3: z.string().optional().nullable(),
  address4: z.string().optional().nullable(),
  address5: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export default async function vendorRoutes(fastify: FastifyInstance) {
  fastify.get("/vendors", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.vendor.findMany({
      orderBy: { name: "asc" }
    });
  });

  fastify.post("/vendors", { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const payload = vendorSchema.parse(request.body);
    return fastify.prisma.vendor.create({
      data: {
        name: payload.name,
        accountRef: payload.accountRef,
        defNomCode: payload.defNomCode ?? null,
        tradeContact: payload.tradeContact ?? null,
        address1: payload.address1 ?? null,
        address2: payload.address2 ?? null,
        address3: payload.address3 ?? null,
        address4: payload.address4 ?? null,
        address5: payload.address5 ?? null,
        isActive: payload.isActive ?? true
      }
    });
  });

  fastify.patch("/vendors/:id", { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = vendorSchema.partial().parse(request.body);
    return fastify.prisma.vendor.update({
      where: { id },
      data: {
        ...payload,
        defNomCode: payload.defNomCode ?? undefined,
        tradeContact: payload.tradeContact ?? undefined,
        address1: payload.address1 ?? undefined,
        address2: payload.address2 ?? undefined,
        address3: payload.address3 ?? undefined,
        address4: payload.address4 ?? undefined,
        address5: payload.address5 ?? undefined
      }
    });
  });
}
