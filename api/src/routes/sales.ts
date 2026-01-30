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
  toEmail: z.string().email().optional()
});

const bulkSchema = z.object({
  careHomeId: z.string().uuid(),
  vendorId: z.string().uuid(),
  date: z.string(),
  items: z.array(
    z.object({
      residentConsentId: z.string().uuid(),
      priceItemId: z.string().uuid()
    })
  )
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

  fastify.post("/sales/bulk", { preHandler: fastify.authenticate }, async (request) => {
    const payload = bulkSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);

    const date = new Date(payload.date);
    const startOfDay = new Date(date.toISOString().slice(0, 10));
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const [priceItems, residentConsents] = await Promise.all([
      fastify.prisma.priceItem.findMany({
        where: { id: { in: payload.items.map((item) => item.priceItemId) } }
      }),
      fastify.prisma.residentConsent.findMany({
        where: { id: { in: payload.items.map((item) => item.residentConsentId) } }
      })
    ]);
    const priceItemMap = new Map(priceItems.map((item) => [item.id, item]));
    const residentMap = new Map(residentConsents.map((item) => [item.id, item]));

    const residentIds = Array.from(
      new Set(
        residentConsents
          .map((item) => item.careHqResidentId)
          .filter((value): value is string => Boolean(value))
      )
    );

    const created = await fastify.prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({
        where: {
          careHomeId: payload.careHomeId,
          vendorId: payload.vendorId,
          careHqResidentId: { in: residentIds },
          date: { gte: startOfDay, lt: endOfDay }
        }
      });

      return Promise.all(
        payload.items.map(async (item) => {
          const priceItem = priceItemMap.get(item.priceItemId);
          if (!priceItem) {
            throw fastify.httpErrors.badRequest("Price item not found");
          }
          const consent = residentMap.get(item.residentConsentId);
          if (!consent) {
            throw fastify.httpErrors.badRequest("Resident consent not found");
          }
          let careHqResidentId = consent.careHqResidentId ?? null;
          if (!careHqResidentId && consent.accountCode) {
            const resident = await tx.careHqResident.findFirst({
              where: { accountCode: consent.accountCode, careHomeId: payload.careHomeId }
            });
            careHqResidentId = resident?.id ?? null;
          }
          if (!careHqResidentId) {
            throw fastify.httpErrors.badRequest("Resident is not linked to CareHQ");
          }
          return tx.saleItem.create({
            data: {
              careHomeId: payload.careHomeId,
              careHqResidentId,
              vendorId: payload.vendorId,
              priceItemId: priceItem.id,
              description: priceItem.description,
              price: Number(priceItem.price),
              date
            }
          });
        })
      );
    });

    return { created: created.length };
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
      vendorAddressLines: [vendor.address1, vendor.address2, vendor.address3, vendor.address4, vendor.address5],
      careHomeName: careHome.name,
      invoiceNo,
      issuedAt,
      items: items.map((item) => ({
        residentName: item.careHqResident.fullName ?? item.careHqResident.roomNumber ?? "Resident",
        description: item.description,
        price: Number(item.price)
      }))
    });

    if (payload.toEmail) {
      await sendGraphMailWithAttachment({
        to: payload.toEmail,
        subject: `Invoice ${invoiceNo}`,
        html: `<p>Invoice ${invoiceNo} attached.</p>`,
        attachmentName: `${invoiceNo}.pdf`,
        attachmentContent: pdf
      });
    }

    await fastify.prisma.saleItem.updateMany({
      where: { id: { in: items.map((item) => item.id) } },
      data: { invoiced: true, invoiceNumber: invoiceNo }
    });

    return { invoiceNo, itemCount: items.length };
  });

  fastify.post("/sales/invoice/preview", { preHandler: fastify.authenticate }, async (request, reply) => {
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
          ...(periodStart || periodEnd
            ? {
                date: {
                  ...(periodStart ? { gte: periodStart } : {}),
                  ...(periodEnd ? { lte: periodEnd } : {})
                }
              }
            : {})
        },
        include: { careHqResident: true }
      })
    ]);

    if (!careHome || !vendor) {
      throw fastify.httpErrors.notFound("Care home or vendor not found");
    }
    if (!items.length) {
      throw fastify.httpErrors.badRequest("No items available");
    }

    const issuedAt = new Date();
    const invoiceNo = `${vendor.accountRef}-${issuedAt.toISOString().slice(0, 10).replace(/-/g, "")}`;

    const pdf = await createSalesInvoicePdf({
      vendorName: vendor.name,
      vendorAccountRef: vendor.accountRef,
      vendorAddressLines: [vendor.address1, vendor.address2, vendor.address3, vendor.address4, vendor.address5],
      careHomeName: careHome.name,
      invoiceNo,
      issuedAt,
      items: items
        .sort((a, b) => (a.careHqResident.roomNumber ?? "").localeCompare(b.careHqResident.roomNumber ?? ""))
        .map((item) => ({
          residentName: item.careHqResident.fullName ?? item.careHqResident.roomNumber ?? "Resident",
          description: item.description,
          price: Number(item.price)
        }))
    });

    reply.header("Content-Type", "application/pdf");
    return reply.send(pdf);
  });
}
