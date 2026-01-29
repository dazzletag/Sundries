import { FastifyInstance } from "fastify";
import { fetchCareHqResidents } from "../services/carehq";

export default async function careHqRoutes(fastify: FastifyInstance) {
  fastify.get("/residents", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.careHqResident.findMany({
      include: { careHome: true },
      orderBy: [{ careHome: { name: "asc" } }, { roomNumber: "asc" }]
    });
  });

  fastify.post("/residents/sync", { preHandler: fastify.authenticate }, async (request) => {
    const residents = await fetchCareHqResidents();
    const careHomes = await fastify.prisma.careHome.findMany({ select: { id: true, name: true } });
    const careHomeByName = new Map(careHomes.map((home) => [home.name.toLowerCase(), home.id]));

    const now = new Date();
    const upserts = [];
    let skipped = 0;

    for (const resident of residents) {
      const careHomeId = careHomeByName.get(resident.careHomeName.toLowerCase());
      if (!careHomeId) {
        skipped += 1;
        continue;
      }

      upserts.push(
        fastify.prisma.careHqResident.upsert({
          where: { careHqRoomId: resident.careHqRoomId },
          create: {
            careHomeId,
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
      skipped,
      total: residents.length,
      lastSyncedAt: now.toISOString()
    };
  });
}
