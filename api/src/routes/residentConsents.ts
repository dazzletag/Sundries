import { FastifyInstance } from "fastify";
import { z } from "zod";

const listQuerySchema = z.object({
  careHomeId: z.string().uuid()
});

const updateConsentSchema = z.object({
  sundryConsentReceived: z.boolean().optional(),
  newspapersConsent: z.boolean().optional(),
  chiropodyConsent: z.boolean().optional(),
  hairdressersConsent: z.boolean().optional(),
  shopConsent: z.boolean().optional(),
  otherConsent: z.boolean().optional(),
  comments: z.string().nullable().optional(),
  chiropodyNote: z.string().nullable().optional(),
  shopNote: z.string().nullable().optional(),
  currentResident: z.boolean().optional()
});

const bootstrapSchema = z.object({
  careHomeId: z.string().uuid()
});

export default async function residentConsentRoutes(fastify: FastifyInstance) {
  fastify.get("/resident-consents", { preHandler: fastify.authenticate }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    await fastify.requireHomeAccess(request, query.careHomeId);

    return fastify.prisma.residentConsent.findMany({
      where: { careHomeId: query.careHomeId },
      include: { careHqResident: true },
      orderBy: [{ roomNumber: "asc" }, { fullName: "asc" }]
    });
  });

  fastify.patch("/resident-consents/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = updateConsentSchema.parse(request.body);

    const existing = await fastify.prisma.residentConsent.findUnique({ where: { id } });
    if (!existing) {
      throw fastify.httpErrors.notFound("Consent record not found");
    }

    await fastify.requireHomeAccess(request, existing.careHomeId);

    return fastify.prisma.residentConsent.update({
      where: { id },
      data: payload
    });
  });

  fastify.post("/resident-consents/bootstrap", { preHandler: fastify.authenticate }, async (request) => {
    const payload = bootstrapSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);

    const residents = await fastify.prisma.careHqResident.findMany({
      where: { careHomeId: payload.careHomeId }
    });

    const activeResidents = residents.filter(
      (resident) => !resident.isVacant && resident.fullName !== "*Vacant*"
    );
    const activeIds = new Set(activeResidents.map((resident) => resident.id));

    const upserts = activeResidents.map((resident) =>
      fastify.prisma.residentConsent.upsert({
        where: { careHqResidentId: resident.id },
        create: {
          careHomeId: payload.careHomeId,
          careHqResidentId: resident.id,
          roomNumber: resident.roomNumber,
          fullName: resident.fullName,
          accountCode: resident.accountCode,
          serviceUserId: resident.serviceUserId,
          currentResident: true
        },
        update: {
          roomNumber: resident.roomNumber,
          fullName: resident.fullName,
          accountCode: resident.accountCode,
          serviceUserId: resident.serviceUserId,
          currentResident: true
        }
      })
    );

    const deactivate = fastify.prisma.residentConsent.updateMany({
      where: {
        careHomeId: payload.careHomeId,
        currentResident: true,
        careHqResidentId: { notIn: Array.from(activeIds) }
      },
      data: { currentResident: false }
    });

    await fastify.prisma.$transaction([...upserts, deactivate]);

    return {
      careHomeId: payload.careHomeId,
      activeResidents: activeResidents.length,
      totalResidents: residents.length
    };
  });
}
