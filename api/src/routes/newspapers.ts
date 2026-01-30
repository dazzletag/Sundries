import { FastifyInstance } from "fastify";
import { z } from "zod";

const orderUpsertSchema = z.object({
  careHomeId: z.string().uuid(),
  careHqResidentId: z.string().uuid(),
  newspaperId: z.string().uuid(),
  itemTitle: z.string().min(1),
  price: z.number(),
  monday: z.boolean().optional(),
  tuesday: z.boolean().optional(),
  wednesday: z.boolean().optional(),
  thursday: z.boolean().optional(),
  friday: z.boolean().optional(),
  saturday: z.boolean().optional(),
  sunday: z.boolean().optional()
});

const ordersQuerySchema = z.object({
  careHomeId: z.string().uuid().optional(),
  careHqResidentId: z.string().uuid().optional()
});

export default async function newspaperRoutes(fastify: FastifyInstance) {
  fastify.get("/newspapers", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.newspaper.findMany({
      where: { isActive: true },
      orderBy: { sort: "asc" }
    });
  });

  fastify.get("/newspaper-orders", { preHandler: fastify.authenticate }, async (request) => {
    const query = ordersQuerySchema.parse(request.query);
    if (query.careHomeId) {
      await fastify.requireHomeAccess(request, query.careHomeId);
    }
    return fastify.prisma.newspaperOrder.findMany({
      where: {
        careHomeId: query.careHomeId,
        careHqResidentId: query.careHqResidentId
      },
      include: { careHqResident: true, newspaper: true },
      orderBy: [{ careHqResidentId: "asc" }, { itemTitle: "asc" }]
    });
  });

  fastify.get("/newspaper-orders/today", { preHandler: fastify.authenticate }, async (request) => {
    const query = ordersQuerySchema.parse(request.query);
    if (!query.careHomeId) {
      throw fastify.httpErrors.badRequest("careHomeId is required");
    }
    await fastify.requireHomeAccess(request, query.careHomeId);

    const day = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date());
    const dayField = day.toLowerCase() as keyof Pick<
      ReturnType<typeof orderUpsertSchema.parse>,
      "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    >;

    return fastify.prisma.newspaperOrder.findMany({
      where: {
        careHomeId: query.careHomeId,
        [dayField]: true
      },
      include: { careHqResident: true, newspaper: true },
      orderBy: { itemTitle: "asc" }
    });
  });

  fastify.post("/newspaper-orders", { preHandler: fastify.authenticate }, async (request) => {
    const payload = orderUpsertSchema.parse(request.body);
    await fastify.requireHomeAccess(request, payload.careHomeId);

    return fastify.prisma.newspaperOrder.upsert({
      where: {
        careHqResidentId_newspaperId: {
          careHqResidentId: payload.careHqResidentId,
          newspaperId: payload.newspaperId
        }
      },
      create: {
        careHomeId: payload.careHomeId,
        careHqResidentId: payload.careHqResidentId,
        newspaperId: payload.newspaperId,
        itemTitle: payload.itemTitle,
        price: payload.price,
        monday: payload.monday ?? false,
        tuesday: payload.tuesday ?? false,
        wednesday: payload.wednesday ?? false,
        thursday: payload.thursday ?? false,
        friday: payload.friday ?? false,
        saturday: payload.saturday ?? false,
        sunday: payload.sunday ?? false
      },
      update: {
        itemTitle: payload.itemTitle,
        price: payload.price,
        monday: payload.monday ?? undefined,
        tuesday: payload.tuesday ?? undefined,
        wednesday: payload.wednesday ?? undefined,
        thursday: payload.thursday ?? undefined,
        friday: payload.friday ?? undefined,
        saturday: payload.saturday ?? undefined,
        sunday: payload.sunday ?? undefined
      }
    });
  });
}
