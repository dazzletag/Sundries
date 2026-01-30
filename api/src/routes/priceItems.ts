import { FastifyInstance } from "fastify";
import { z } from "zod";

const priceItemSchema = z.object({
  vendorId: z.string().uuid(),
  description: z.string().min(1),
  price: z.number(),
  validFrom: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export default async function priceItemRoutes(fastify: FastifyInstance) {
  fastify.get("/price-items", { preHandler: fastify.authenticate }, async (request) => {
    const { vendorId } = request.query as { vendorId?: string };
    if (!vendorId) {
      return fastify.prisma.priceItem.findMany({
        include: { vendor: true },
        orderBy: { description: "asc" }
      });
    }
    return fastify.prisma.priceItem.findMany({
      where: { vendorId },
      orderBy: { description: "asc" }
    });
  });

  fastify.post("/price-items", { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const payload = priceItemSchema.parse(request.body);
    return fastify.prisma.priceItem.create({
      data: {
        vendorId: payload.vendorId,
        description: payload.description,
        price: payload.price,
        validFrom: payload.validFrom ? new Date(payload.validFrom) : null,
        isActive: payload.isActive ?? true
      }
    });
  });

  fastify.patch("/price-items/:id", { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = priceItemSchema.partial().parse(request.body);
    return fastify.prisma.priceItem.update({
      where: { id },
      data: {
        ...payload,
        validFrom: payload.validFrom === null ? null : payload.validFrom ? new Date(payload.validFrom) : undefined
      }
    });
  });
}
