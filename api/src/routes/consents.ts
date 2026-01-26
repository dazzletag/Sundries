import { FastifyInstance } from "fastify";
import { z } from "zod";

const serviceTypeEnum = z.enum(["Hairdressing", "Chiropody", "ChiropodyPremium", "Other"]);

const createConsentSchema = z.object({
  residentId: z.string().uuid(),
  supplierId: z.string().uuid(),
  serviceType: serviceTypeEnum,
  consentGivenAt: z.string(),
  consentExpiresAt: z.string().nullable().optional(),
  notes: z.string().optional()
});

const updateConsentSchema = z.object({
  consentExpiresAt: z.string().nullable().optional(),
  status: z.enum(["Active", "Paused", "Revoked"]).optional(),
  notes: z.string().optional()
});

export default async function consentRoutes(fastify: FastifyInstance) {
  fastify.get("/residents/:id/consents", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return fastify.prisma.consent.findMany({ where: { residentId: id }, orderBy: { consentGivenAt: "desc" } });
  });

  fastify.post("/consents", { preHandler: fastify.authenticate }, async (request) => {
    const payload = createConsentSchema.parse(request.body);
    const subscriber = request.auth?.upn ?? request.auth?.preferred_username ?? "system";
    return fastify.prisma.consent.create({
      data: {
        ...payload,
        createdBy: subscriber,
        consentGivenAt: new Date(payload.consentGivenAt),
        consentExpiresAt: payload.consentExpiresAt ? new Date(payload.consentExpiresAt) : null
      }
    });
  });

  fastify.patch("/consents/:id", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = updateConsentSchema.parse(request.body);
    return fastify.prisma.consent.update({
      where: { id },
      data: {
        ...payload,
        consentExpiresAt: payload.consentExpiresAt === null ? null : payload.consentExpiresAt ? new Date(payload.consentExpiresAt) : undefined
      }
    });
  });
}
