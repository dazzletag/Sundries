import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createSalesInvoicePdf } from "../lib/pdf";
import { sendGraphMailWithAttachment } from "../lib/graph";

const listSchema = z.object({
  careHomeId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),
  invoiced: z.coerce.boolean().optional()
});

const createSchema = z.object({
  careHomeId: z.string().uuid(),
  careHqResidentId: z.string().uuid(),
  vendorId: z.string().uuid(),
  priceItemId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  price: z.number(),
  date: z.string()
});

const invoiceSchema = z.object({
  careHomeId: z.string().uuid(),
  vendorId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  toEmail: z.string().email()
});

export default async function salesRoutes(fastify: FastifyInstance) {
  fastify.get("/sales", { preHandler: fastify.authenticate }, async (request) => {
    const query = listSchema.parse(request.query);
    await fastify.requireHomeAccess(request, query.careHomeId);

    return fastify.prisma.saleItem.findMany({
      where: {
        careHomeId: query.careHomeId,
        vendorId: query.vendorId,
        invoiced: query.invoiced
      },
      include: { careHqResident: true, vendor: true, priceItem: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    });
  });

  fastify.post("/sales", { preHandler: fastify.authenticate }, async (request) => {
    const payload = createSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);

    return fastify.prisma.saleItem.create({
      data: {
        careHomeId: payload.careHomeId,
        careHqResidentId: payload.careHqResidentId,
        vendorId: payload.vendorId,
        priceItemId: payload.priceItemId ?? null,
        description: payload.description,
        price: payload.price,
        date: new Date(payload.date)
      }
    });
  });

  fastify.delete("/sales/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const existing = await fastify.prisma.saleItem.findUnique({ where: { id } });
    if (!existing) {
      throw fastify.httpErrors.notFound("Sale item not found");
    }
    await fastify.requireHomeAccess(request, existing.careHomeId);
    return fastify.prisma.saleItem.delete({ where: { id } });
  });

  fastify.post("/sales/invoice", { preHandler: fastify.authenticate }, async (request) => {
    const payload = invoiceSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);

    const periodStart = payload.from ? new Date(payload.from) : undefined;
    const periodEnd = payload.to ? new Date(payload.to) : undefined;

    const [careHome, vendor, items] = await Promise.all([
      fastify.prisma.careHome.findUnique({ where: { id: payload.careHomeId } }),
      fastify.prisma.vendor.findUnique({ where: { id: payload.vendorId } }),
      fastify.prisma.saleItem.findMany({
        where: {
          careHomeId: payload.careHomeId,
          vendorId: payload.vendorId,
          invoiced: false,
          ...(periodStart || periodEnd
            ? {
                date: {
                  ...(periodStart ? { gte: periodStart } : {}),
                  ...(periodEnd ? { lte: periodEnd } : {})
                }
              }
            : {})
        },
        include: { careHqResident: true, priceItem: true }
      })
    ]);

    if (!careHome || !vendor) {
      throw fastify.httpErrors.notFound("Care home or vendor not found");
    }
    if (!items.length) {
      throw fastify.httpErrors.badRequest("No items to invoice");
    }

    const issuedAt = new Date();
    const invoiceNo = `${vendor.accountRef}-${issuedAt.toISOString().slice(0, 10).replace(/-/g, "")}`;

    const pdf = await createSalesInvoicePdf({
      vendorName: vendor.name,
      vendorAccountRef: vendor.accountRef,
      careHomeName: careHome.name,
      invoiceNo,
      issuedAt,
      items: items.map((item) => ({
        residentName: item.careHqResident.fullName ?? item.careHqResident.roomNumber ?? "Resident",
        description: item.description,
        price: Number(item.price)
      }))
    });

    await sendGraphMailWithAttachment({
      to: payload.toEmail,
      subject: `Invoice ${invoiceNo}`,
      html: `<p>Invoice ${invoiceNo} attached.</p>`,
      attachmentName: `${invoiceNo}.pdf`,
      attachmentContent: pdf
    });

    await fastify.prisma.saleItem.updateMany({
      where: { id: { in: items.map((item) => item.id) } },
      data: { invoiced: true, invoiceNumber: invoiceNo }
    });

    return { invoiceNo, itemCount: items.length };
  });
}
