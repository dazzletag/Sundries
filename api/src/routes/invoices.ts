import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createInvoicePdf } from "../lib/pdf";

const invoiceQuerySchema = z.object({
  vendorId: z.string().uuid().optional(),
  careHomeId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export default async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.get("/invoices", { preHandler: fastify.authenticate }, async (request) => {
    const query = invoiceQuerySchema.parse(request.query);
    const where: any = { invoiceNumber: { not: null } };
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.careHomeId) where.careHomeId = query.careHomeId;
    if (query.from) where.date = { ...where.date, gte: new Date(query.from) };
    if (query.to) where.date = { ...where.date, lte: new Date(query.to) };

    const items = await fastify.prisma.saleItem.findMany({
      where,
      include: { vendor: true, careHome: true },
      orderBy: { date: "desc" }
    });

    const grouped = new Map<string, any>();
    for (const item of items) {
      if (!item.invoiceNumber) continue;
      const existing = grouped.get(item.invoiceNumber);
      if (!existing) {
        grouped.set(item.invoiceNumber, {
          invoiceNo: item.invoiceNumber,
          vendor: item.vendor,
          careHome: item.careHome,
          issuedAt: item.date,
          total: Number(item.price),
          itemCount: 1
        });
      } else {
        existing.total += Number(item.price);
        existing.itemCount += 1;
        if (item.date > existing.issuedAt) existing.issuedAt = item.date;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  });

  fastify.get("/invoices/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const items = await fastify.prisma.saleItem.findMany({
      where: { invoiceNumber: id },
      include: { vendor: true, careHome: true, careHqResident: true }
    });
    if (!items.length) {
      throw fastify.httpErrors.notFound("Invoice not found");
    }
    const first = items[0];
    return {
      invoiceNo: id,
      vendor: first.vendor,
      careHome: first.careHome,
      issuedAt: first.date,
      items
    };
  });

  fastify.get("/invoices/:id/pdf", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await fastify.prisma.saleItem.findMany({
      where: { invoiceNumber: id },
      include: { vendor: true, careHome: true, careHqResident: true }
    });
    if (!items.length) throw fastify.httpErrors.notFound("Invoice not found");

    const first = items[0];
    const buffer = await createInvoicePdf({
      invoiceNo: id,
      vendor: first.vendor,
      careHome: first.careHome,
      issuedAt: first.date,
      items: items
        .sort((a, b) => (a.careHqResident.roomNumber ?? "").localeCompare(b.careHqResident.roomNumber ?? ""))
        .map((item) => ({
          residentName: item.careHqResident.fullName ?? item.careHqResident.roomNumber ?? "Resident",
          description: item.description,
          price: Number(item.price)
        }))
    });

    reply.header("Content-Type", "application/pdf");
    return reply.send(buffer);
  });
}



