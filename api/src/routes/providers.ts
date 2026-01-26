import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ProviderVisit } from "../types/prisma";

const querySchema = z.object({ visitId: z.string().uuid().optional() });

export default async function providerRoutes(fastify: FastifyInstance) {
  fastify.get("/providers/:supplierId/client-list", { preHandler: fastify.authenticate }, async (request) => {
    const { supplierId } = request.params as { supplierId: string };
    const { visitId } = querySchema.parse(request.query);

    const visits = (await fastify.prisma.visit.findMany({
      where: {
        supplierId,
        ...(visitId ? { id: visitId } : {})
      },
      include: {
        careHome: true,
        items: {
          include: {
            resident: true
          }
        }
      },
      orderBy: { visitedAt: "desc" }
    })) as ProviderVisit[];

    return {
      supplierId,
      generatedAt: new Date().toISOString(),
      visits: visits.map((visit) => ({
        visitId: visit.id,
        careHome: visit.careHome,
        visitedAt: visit.visitedAt,
        items: visit.items.map((item) => ({
          resident: item.resident,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          lineTotal: item.lineTotal
        }))
      }))
    };
  });
}

