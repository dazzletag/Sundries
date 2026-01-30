import { FastifyInstance } from "fastify";
import { z } from "zod";

const visitSchema = z.object({
  careHomeId: z.string().uuid(),
  supplierId: z.string().uuid(),
  visitedAt: z.string(),
  notes: z.string().optional()
});

const visitItemSchema = z.object({
  residentId: z.string().uuid(),
  description: z.string().min(3),
  qty: z.number().positive(),
  unitPrice: z.number().positive(),
  vatRate: z.number().min(0)
});

const visitQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  careHomeId: z.string().uuid().optional(),
  status: z.enum(["Draft", "Confirmed", "Invoiced"]).optional()
});

const printQuerySchema = z.object({
  careHomeId: z.string().uuid(),
  vendorId: z.string().uuid(),
  date: z.string().optional()
});

const visitSheetCreateSchema = z.object({
  careHomeId: z.string().uuid(),
  vendorId: z.string().uuid(),
  visitDate: z.string()
});

const resolveConsentFilter = (tradeContact?: string | null) => {
  const value = (tradeContact ?? "").toLowerCase();
  if (value.includes("hair")) return { hairdressersConsent: true };
  if (value.includes("chiropod")) return { chiropodyConsent: true };
  if (value.includes("news")) return { newspapersConsent: true };
  if (value.includes("shop")) return { shopConsent: true };
  if (value.includes("other")) return { otherConsent: true };
  return { sundryConsentReceived: true };
};

const ensureConsent = async (
  fastify: FastifyInstance,
  residentId: string,
  supplierId: string,
  visitedAt: Date,
  serviceType: string
) => {
  const consent = await fastify.prisma.consent.findFirst({
    where: {
      residentId,
      supplierId,
      serviceType,
      status: "Active",
      consentGivenAt: { lte: visitedAt },
      OR: [
        { consentExpiresAt: null },
        { consentExpiresAt: { gte: visitedAt } }
      ]
    }
  });

  if (!consent) {
    throw fastify.httpErrors.badRequest("Active consent not found for resident and supplier");
  }

  return consent;
};

const ensureVisitIsEditable = (visit: { status: string }, fastify: FastifyInstance) => {
  if (visit.status === "Invoiced") {
    throw fastify.httpErrors.badRequest("Visit is locked after invoicing");
  }
};

export default async function visitRoutes(fastify: FastifyInstance) {
  fastify.post("/visits", { preHandler: fastify.authenticate }, async (request) => {
    const payload = visitSchema.parse(request.body);
    const visitedAt = new Date(payload.visitedAt);
    return fastify.prisma.visit.create({
      data: {
        careHomeId: payload.careHomeId,
        supplierId: payload.supplierId,
        visitedAt,
        notes: payload.notes,
        createdBy: request.auth?.upn ?? request.auth?.preferred_username ?? "system"
      }
    });
  });

  fastify.get("/visits", { preHandler: fastify.authenticate }, async (request) => {
    const query = visitQuerySchema.parse(request.query);
    const where: any = {};
    if (query.from) where.visitedAt = { ...where.visitedAt, gte: new Date(query.from) };
    if (query.to) where.visitedAt = { ...where.visitedAt, lte: new Date(query.to) };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.careHomeId) where.careHomeId = query.careHomeId;
    if (query.status) where.status = query.status;

    return fastify.prisma.visit.findMany({
      where,
      include: { items: { include: { resident: true } }, supplier: true },
      orderBy: { visitedAt: "desc" }
    });
  });

  fastify.get("/visit-sheets", { preHandler: fastify.authenticate }, async (request) => {
    const query = visitQuerySchema.parse(request.query);
    const where: any = {};
    if (query.from) where.visitDate = { ...where.visitDate, gte: new Date(query.from) };
    if (query.to) where.visitDate = { ...where.visitDate, lte: new Date(query.to) };
    if (query.careHomeId) where.careHomeId = query.careHomeId;
    if (query.supplierId) where.vendorId = query.supplierId;

    return fastify.prisma.visitSheet.findMany({
      where,
      include: { careHome: true, vendor: true },
      orderBy: { visitDate: "desc" }
    });
  });

  fastify.post("/visit-sheets", { preHandler: fastify.authenticate }, async (request) => {
    const payload = visitSheetCreateSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);
    const visitDate = new Date(payload.visitDate);

    return fastify.prisma.visitSheet.upsert({
      where: {
        careHomeId_vendorId_visitDate: {
          careHomeId: payload.careHomeId,
          vendorId: payload.vendorId,
          visitDate
        }
      },
      create: {
        careHomeId: payload.careHomeId,
        vendorId: payload.vendorId,
        visitDate,
        createdBy: request.auth?.upn ?? request.auth?.preferred_username ?? "system"
      },
      update: {}
    });
  });

  fastify.get("/visit-sheets/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const sheet = await fastify.prisma.visitSheet.findUnique({
      where: { id },
      include: { careHome: true, vendor: true }
    });
    if (!sheet) throw fastify.httpErrors.notFound("Visit not found");
    await fastify.requireHomeAccess(request, sheet.careHomeId);

    const consentFilter = resolveConsentFilter(sheet.vendor.tradeContact);
    const residents = await fastify.prisma.residentConsent.findMany({
      where: {
        careHomeId: sheet.careHomeId,
        currentResident: true,
        ...consentFilter
      },
      orderBy: [{ roomNumber: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        roomNumber: true,
        fullName: true,
        accountCode: true
      }
    });

    const priceItems = await fastify.prisma.priceItem.findMany({
      where: { vendorId: sheet.vendorId, isActive: true },
      orderBy: { description: "asc" },
      select: {
        id: true,
        description: true,
        price: true,
        validFrom: true
      }
    });

    const existingSales = await fastify.prisma.saleItem.findMany({
      where: {
        careHomeId: sheet.careHomeId,
        vendorId: sheet.vendorId,
        date: {
          gte: new Date(sheet.visitDate.toISOString().slice(0, 10)),
          lt: new Date(new Date(sheet.visitDate).setDate(sheet.visitDate.getDate() + 1))
        }
      },
      select: { careHqResidentId: true, priceItemId: true }
    });

    return {
      visitId: sheet.id,
      visitedAt: sheet.visitDate.toISOString(),
      careHome: sheet.careHome,
      vendor: {
        id: sheet.vendor.id,
        name: sheet.vendor.name,
        accountRef: sheet.vendor.accountRef,
        tradeContact: sheet.vendor.tradeContact ?? ""
      },
      consentField: Object.keys(consentFilter)[0],
      residents,
      priceItems,
      selections: existingSales.filter((item) => item.priceItemId).map((item) => ({
        residentId: item.careHqResidentId,
        priceItemId: item.priceItemId as string
      }))
    };
  });

  fastify.get("/visits/print", { preHandler: fastify.authenticate }, async (request) => {
    const query = printQuerySchema.parse(request.query);
    await fastify.requireHomeAccess(request, query.careHomeId);

    const [careHome, vendor] = await Promise.all([
      fastify.prisma.careHome.findUnique({ where: { id: query.careHomeId } }),
      fastify.prisma.vendor.findUnique({ where: { id: query.vendorId } })
    ]);

    if (!careHome) throw fastify.httpErrors.notFound("Care home not found");
    if (!vendor) throw fastify.httpErrors.notFound("Vendor not found");

    const consentFilter = resolveConsentFilter(vendor.tradeContact);
    const residents = await fastify.prisma.residentConsent.findMany({
      where: {
        careHomeId: query.careHomeId,
        currentResident: true,
        ...consentFilter
      },
      orderBy: [{ roomNumber: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        roomNumber: true,
        fullName: true,
        accountCode: true
      }
    });

    const priceItems = await fastify.prisma.priceItem.findMany({
      where: { vendorId: vendor.id, isActive: true },
      orderBy: { description: "asc" },
      select: {
        id: true,
        description: true,
        price: true,
        validFrom: true
      }
    });

    return {
      visitedAt: query.date ? new Date(query.date).toISOString() : new Date().toISOString(),
      careHome,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        accountRef: vendor.accountRef,
        tradeContact: vendor.tradeContact ?? ""
      },
      consentField: Object.keys(consentFilter)[0],
      residents,
      priceItems
    };
  });

  fastify.post("/visits/:id/items", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = visitItemSchema.parse(request.body);
    const visit = await fastify.prisma.visit.findUnique({
      where: { id },
      include: { supplier: true }
    });
    if (!visit) throw fastify.httpErrors.notFound("Visit not found");
    ensureVisitIsEditable(visit, fastify);
    await ensureConsent(fastify, payload.residentId, visit.supplierId, visit.visitedAt, visit.supplier.serviceType);

    const lineTotal = payload.qty * payload.unitPrice * (1 + payload.vatRate / 100);
    return fastify.prisma.visitItem.create({
      data: {
        visitId: id,
        residentId: payload.residentId,
        description: payload.description,
        qty: payload.qty,
        unitPrice: payload.unitPrice,
        vatRate: payload.vatRate,
        lineTotal: Number(lineTotal)
      }
    });
  });

  fastify.patch("/visit-items/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = visitItemSchema.partial().parse(request.body);
    const existing = await fastify.prisma.visitItem.findUnique({
      where: { id },
      include: { visit: true }
    });
    if (!existing) throw fastify.httpErrors.notFound("Visit item not found");
    ensureVisitIsEditable(existing.visit, fastify);
    let updates: any = {};
    if (payload.description) updates.description = payload.description;
    if (payload.qty !== undefined) updates.qty = payload.qty;
    if (payload.unitPrice !== undefined) updates.unitPrice = payload.unitPrice;
    if (payload.vatRate !== undefined) updates.vatRate = payload.vatRate;
    const qty = payload.qty ?? Number(existing.qty);
    const unitPrice = payload.unitPrice ?? Number(existing.unitPrice);
    const vatRate = payload.vatRate ?? Number(existing.vatRate);
    updates.lineTotal = qty * unitPrice * (1 + vatRate / 100);
    return fastify.prisma.visitItem.update({ where: { id }, data: updates });
  });

  fastify.post("/visits/:id/confirm", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return fastify.prisma.visit.update({
      where: { id },
      data: { status: "Confirmed" }
    });
  });
}
