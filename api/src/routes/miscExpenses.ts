import { FastifyInstance } from "fastify";
import { z } from "zod";

const residentQuerySchema = z.object({
  careHomeId: z.string().uuid()
});

const createSchema = z.object({
  careHomeId: z.string().uuid(),
  residentConsentId: z.string().uuid(),
  type: z.enum(["Escort", "Other"]),
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive()
});

const ensureMiscVendor = async (fastify: FastifyInstance) => {
  const accountRef = "MISC";
  const existing = await fastify.prisma.vendor.findUnique({ where: { accountRef } });
  if (existing) return existing;
  return fastify.prisma.vendor.create({
    data: {
      accountRef,
      name: "Misc Expenses",
      isActive: true
    }
  });
};

export default async function miscExpenseRoutes(fastify: FastifyInstance) {
  fastify.get("/misc-expenses/residents", { preHandler: fastify.authenticate }, async (request) => {
    const query = residentQuerySchema.parse(request.query);
    await fastify.requireHomeAccess(request, query.careHomeId);

    const residents = await fastify.prisma.residentConsent.findMany({
      where: {
        careHomeId: query.careHomeId,
        currentResident: true,
        otherConsent: true
      },
      orderBy: [{ roomNumber: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        roomNumber: true,
        fullName: true,
        accountCode: true,
        careHqResidentId: true
      }
    });

    return residents;
  });

  fastify.post("/misc-expenses", { preHandler: fastify.authenticate }, async (request) => {
    const payload = createSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);

    const consent = await fastify.prisma.residentConsent.findUnique({
      where: { id: payload.residentConsentId }
    });
    if (!consent) throw fastify.httpErrors.notFound("Resident consent not found");

    let careHqResidentId = consent.careHqResidentId ?? null;
    if (!careHqResidentId && consent.accountCode) {
      const resident = await fastify.prisma.careHqResident.findFirst({
        where: { accountCode: consent.accountCode, careHomeId: payload.careHomeId }
      });
      careHqResidentId = resident?.id ?? null;
    }
    if (!careHqResidentId) {
      throw fastify.httpErrors.badRequest("Resident is not linked to CareHQ");
    }

    const vendor = await ensureMiscVendor(fastify);
    const date = new Date(payload.date);
    const invoiceNo = `MISC-${payload.careHomeId.slice(0, 6)}-${date.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const item = await fastify.prisma.saleItem.create({
      data: {
        careHomeId: payload.careHomeId,
        careHqResidentId,
        vendorId: vendor.id,
        priceItemId: null,
        description: `${payload.type}: ${payload.description}`,
        price: payload.amount,
        date,
        invoiced: true,
        invoiceNumber: invoiceNo
      }
    });

    return { invoiceNo, saleItemId: item.id };
  });
}
