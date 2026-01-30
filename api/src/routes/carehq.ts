import { FastifyInstance } from "fastify";
import { fetchCareHqResidents } from "../services/carehq";

export default async function careHqRoutes(fastify: FastifyInstance) {
  fastify.get("/residents", { preHandler: fastify.authenticate }, async (request) => {
    const { careHomeId, careHomeName } = request.query as {
      careHomeId?: string;
      careHomeName?: string;
    };
    const context = await fastify.getUserContext(request);

    if (careHomeId) {
      await fastify.requireHomeAccess(request, careHomeId);
    } else if (!context.isAdmin && context.careHomeIds.length === 0 && context.careHomeNames.length === 0) {
      throw fastify.httpErrors.forbidden("No assigned care homes");
    }

    const homeIdFilter = careHomeId ? [careHomeId] : context.careHomeIds;
    const homeNameFilter = careHomeName ? [careHomeName] : context.careHomeNames;

    const where =
      context.isAdmin && !careHomeId && !careHomeName
        ? {}
        : {
            OR: [
              ...(homeIdFilter.length ? [{ careHomeId: { in: homeIdFilter } }] : []),
              ...(homeNameFilter.length ? [{ careHomeName: { in: homeNameFilter } }] : [])
            ]
          };

    return fastify.prisma.careHqResident.findMany({
      where,
      orderBy: [{ careHomeName: "asc" }, { roomNumber: "asc" }]
    });
  });

  fastify.post("/residents/sync", { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const residents = await fetchCareHqResidents();
    const careHomes = await fastify.prisma.careHome.findMany({
      select: { id: true, name: true }
    });
    const careHomeMap = new Map(careHomes.map((home) => [home.name, home.id]));

    const now = new Date();
    const upserts = [];

    for (const resident of residents) {
      const careHomeId = careHomeMap.get(resident.careHomeName);
      upserts.push(
        fastify.prisma.careHqResident.upsert({
          where: { careHqRoomId: resident.careHqRoomId },
          create: {
            careHomeId,
            careHomeName: resident.careHomeName,
            careHqLocationId: resident.careHqLocationId,
            careHqRoomId: resident.careHqRoomId,
            roomNumber: resident.roomNumber,
            fullName: resident.fullName,
            accountCode: resident.accountCode,
            serviceUserId: resident.serviceUserId,
            isVacant: resident.isVacant,
            lastSyncedAt: now
          },
          update: {
            careHomeId,
            careHomeName: resident.careHomeName,
            careHqLocationId: resident.careHqLocationId,
            roomNumber: resident.roomNumber,
            fullName: resident.fullName,
            accountCode: resident.accountCode,
            serviceUserId: resident.serviceUserId,
            isVacant: resident.isVacant,
            lastSyncedAt: now
          }
        })
      );
    }

    if (upserts.length) {
      await fastify.prisma.$transaction(upserts);
    }

    return {
      synced: upserts.length,
      total: residents.length,
      lastSyncedAt: now.toISOString()
    };
  });
}
