import { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeTotals, generateInvoiceNumber } from "../services/invoice";
import { createInvoicePdf } from "../lib/pdf";

const invoiceQuerySchema = z.object({
  supplierId: z.string().uuid().optional(),
  careHomeId: z.string().uuid().optional(),
  status: z.enum(["Draft", "Issued", "Paid"]).optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

const invoiceGenerateSchema = z.object({
  supplierId: z.string().uuid(),
  careHomeId: z.string().uuid(),
  from: z.string(),
  to: z.string()
});

export default async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.post("/invoices/generate", { preHandler: fastify.authenticate }, async (request) => {
    const payload = invoiceGenerateSchema.parse(request.body);
    const periodStart = new Date(payload.from);
    const periodEnd = new Date(payload.to);

    const visits = await fastify.prisma.visit.findMany({
      where: {
        supplierId: payload.supplierId,
        careHomeId: payload.careHomeId,
        visitedAt: { gte: periodStart, lte: periodEnd },
        status: "Confirmed"
      },
      include: { items: { include: { invoiceItem: true } } }
    });

    const eligibleItems = visits.flatMap((v) => v.items).filter((item) => !item.invoiceItem);
    if (!eligibleItems.length) {
      throw fastify.httpErrors.badRequest("No visit items available for invoicing");
    }

    const invoiceNo = await generateInvoiceNumber(fastify.prisma, payload.supplierId, periodStart);
    const totals = computeTotals(
      eligibleItems.map((item) => ({ qty: Number(item.qty), unitPrice: Number(item.unitPrice), vatRate: Number(item.vatRate) }))
    );

    const invoice = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          supplierId: payload.supplierId,
          careHomeId: payload.careHomeId,
          invoiceNo,
          periodStart,
          periodEnd,
          issuedAt: new Date(),
          subtotal: totals.subtotal,
          vatTotal: totals.vatTotal,
          total: totals.total,
          status: "Issued"
        }
      });

      const invoiceItems = await Promise.all(
        eligibleItems.map((item) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: created.id,
              visitItemId: item.id,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              lineTotal: item.lineTotal
            }
          })
        )
      );

      await tx.visit.updateMany({
        where: { id: { in: visits.map((v) => v.id) } },
        data: { status: "Invoiced", lockedAt: new Date(), invoiceId: created.id }
      });

      return { created, invoiceItems };
    });

    return { invoice: invoice.created, items: invoice.invoiceItems };
  });

  fastify.get("/invoices", { preHandler: fastify.authenticate }, async (request) => {
    const query = invoiceQuerySchema.parse(request.query);
    const where: any = {};
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.careHomeId) where.careHomeId = query.careHomeId;
    if (query.status) where.status = query.status;
    if (query.from) where.issuedAt = { ...where.issuedAt, gte: new Date(query.from) };
    if (query.to) where.issuedAt = { ...where.issuedAt, lte: new Date(query.to) };

    return fastify.prisma.invoice.findMany({
      where,
      include: { supplier: true, careHome: true },
      orderBy: { issuedAt: "desc" }
    });
  });

  fastify.get("/invoices/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return fastify.prisma.invoice.findUnique({
      where: { id },
      include: { items: { include: { visitItem: true } }, supplier: true, careHome: true }
    });
  });

  fastify.get("/invoices/:id/pdf", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await fastify.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, supplier: true, careHome: true }
    });
    if (!invoice) throw fastify.httpErrors.notFound("Invoice not found");

    const buffer = await createInvoicePdf({
      invoice,
      careHome: invoice.careHome,
      supplier: invoice.supplier,
      items: invoice.items
    });

    reply.header("Content-Type", "application/pdf");
    return reply.send(buffer);
  });
}
